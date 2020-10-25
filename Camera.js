import React, {Component} from 'react';
import { View, findNodeHandle, Text, Image} from 'react-native';

import ImageEditor from "@react-native-community/image-editor";
import RNFS from 'react-native-fs';
import {RNCamera} from 'react-native-camera';


import * as tf from '@tensorflow/tfjs';
import { decodeJpeg, bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { decode } from 'base64-arraybuffer';

import styles from './styles';

//Get reference to bundled model assets 
const modelJson = require('path/model.json');
const modelWeights = require('path/group1-shard1of1.bin');

class Camera extends Component {
    state = {
      cameraState : false,
      inputModel : null,
      imagePath: null,
    };
  
    render() {  
      return (
        <View style={[styles().container]}>          
          {!this.state.cameraState && (
          <View style={[styles().containerCamera]}>
            <RNCamera
              ref={ref => {
                this.camera = ref;
                //console.log("ref of this camera ", ref);
                this.camera_handle = findNodeHandle(ref);
                console.log("camera_handle:", this.camera_handle);
  
              }}
              style={[styles().preview]}
              type={RNCamera.Constants.Type.back}
              flashMode={RNCamera.Constants.FlashMode.auto}
              androidCameraPermissionOptions={{
                title: 'Permission to use camera',
                message: 'We need your permission to use your camera',
                buttonPositive: 'Ok',
                buttonNegative: 'Cancel',
              }}
            />
            <View style={[styles().containerButtonCapture]}>
              <Button onPress={this.takePicture.bind(this)} title={'Snap'} />
            </View>
          </View>
          )}
  
          {this.state.cameraState && this .state.imagePath && (
          <View style={[styles().container]}>
              <Image source={{ uri: this.state.imagePath }}
                    style={[styles().preview]}/>
              <Text style={{color: 'purple', fontSize: 18, fontWeight: 'bold'}}>
                Searching for your product
              </Text>
          </View>
          )}
        </View>
      );
    }

    // Processing of image before applying the model
    takePicture = async () => {
        if (this.camera) {
          // Reshape the image taken from the RNCamera to fit the shape of model TF
          // 1) Capture the image using RNCamera API and resize
          const options = {quality: 1, base64: true};
          this.camera.takePictureAsync( options )
            .then((capturedImg) => {
              // 2a) Extract a reference to the captured image,
              //    along with its natural dimensions
              
              const { uri, width, height } = capturedImg;
              console.log("Image data from the camera (base64): ", width, height);
              console.log("Image Path:", uri);
              //console.log('Image data', data)
    
              this.setState({
                cameraState : true,
                imagePath: uri,
              });
    
              //CameraRoll.savetocameraroll(uri);
    
              const cropData = {
                // 2b) By cropping from (0, 0) to (imgWidth, imgHeight),
                //    we maintain the original image's dimensions
                offset: { x: 0, y: 0 },
                size: { width, height },
    
                // 2c) Use the displaySize option to specify the new image size
                displaySize: { width: 224, height: 224 },
                resizeMode: "cover",
              };
    
              ImageEditor.cropImage(uri, cropData).then(uri => {
                console.log("Resizedimage uri", uri); 
                RNFS.readFile(uri, 'base64').then(resizedImage => {
                  console.log("RNFS read ok");
                  const decodeimageData = decode(resizedImage);
                  console.log("Decoding image data from base64: OK");
                  const imageUint8 = new Uint8Array(decodeimageData);
                  console.log("Transform to Uint8Array OK");
    
                  // Transfer Uint8Array of imageData into Tensor Object
                  const imageTensor = decodeJpeg(imageUint8); 
                  //const imageTensorArrays = imageTensor.print();
                  console.log("imageTensor shape", imageTensor.shape);
                  //console.log("imageTensor data", imageTensor.arraySync());
                  const imageArrays = imageTensor.arraySync();
    
                  //Normalize values of pixels from [0,255] to [0,1]，Important and necessary step
                  for (let i = 0; i < 224; i++) {
                    for (let j = 0; j < 224; j++){
                      //console.log(i,j);
                      //console.log(typeof(imageTensorArrays[i][j]));
                      //console.log(imageTensorArrays[i][j]);
                      imageArrays[i][j].forEach((element, index, array) => array[index]=element/255);
                    }
                  };
                  console.log(imageArrays[0][0]);
                  imageTensorArrays = tf.tensor(imageArrays,[224,224,3], 'float32');
                  console.log("imageTensor shape", imageTensorArrays.shape);
                  // Reshape and retype the input tensor to fit the shape and type of the model ML
                  const imageTensorReshape = imageTensorArrays.reshape([-1, 224, 224, 3]); 
                  console.log("imageTensor reshape to fit the shape of model", imageTensorReshape);
                  //const finalTensor = tf.cast(imageTensorReshape, 'float32');
                  //console.log("Input shape of the model:", finalTensor);
    
                  this.setState({inputModel : imageTensorReshape},
                    () => this.callModelPrediction(this.state.inputModel)
                  );
                })           
              })
            }) 
        }
      };

    //Apply the model
      callModelPrediction = async inputTensor => {
        const model = await tf.loadGraphModel(
          bundleResourceIO(modelJson, modelWeights));
        const prediction = model.predict(inputTensor, 1);               
          prediction.array().then(array => {
            console.log("Array of taux de confiance for each label of products: ", array[0]);
            this.maximum = Math.max(...array[0]);
            console.log("Maximum taux de confiance: ", this.maximum)
            this.indexPredict = array[0].indexOf(this.maximum);
            console.log("Index of the maximum taux de confiance ", this.indexPredict);
            //todo with the result of prediction
          });
        this.setState({cameraState : false,})    
      };
}
  
