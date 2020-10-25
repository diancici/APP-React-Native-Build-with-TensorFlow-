import {StyleSheet} from 'react-native';

const generatedThemes = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerCamera: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  containerButtonCapture: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default () => generatedThemes;
