import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Keyboard,
  Animated,
  ScrollView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Portal, Dialog, IconButton } from 'react-native-paper';
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';

import uuid from 'react-native-uuid';

import { useSharedValue } from 'react-native-reanimated';
import Pattern from './Pattern';
import Images, {PATTERN_LIST} from '../assets/patterns/images'

const { width: SCREEN_WIDTH } = Dimensions.get('screen');



interface Props {
  pattern: string;
  color: string;
  setPattern: (d: string) => void;
}

const PatternSelector: React.FC<Props> = ({ setPattern, pattern, color }) => {
  const [showPalette, setShowPalette] = useState(false);

  const swatchRef = useRef<View>(null);
  const swatchLayoutY = useRef<number>(0);
  const swatchLayoutX = useRef<number>(0);

  const swatchAnimation = useRef<any>(new Animated.Value(0)).current;
  const swatchPosition = useSharedValue<any>(null);
  const caretPosition = useSharedValue<any>(null);

  const openSwatchDialog = () => {
    setShowPalette(true);
  };

  const measureSwatch = () => {
    if (swatchRef.current) {
      swatchRef.current.measure((width, height, px, py, fx, fy) => {
        // width of dialog plus padding
        const dialogWidth = 237;
        // height of dialog plus padding
        const dialogHieght = 225;
        swatchLayoutY.current = fy + py - dialogHieght;
        swatchLayoutX.current = fx + py - dialogWidth;
        // if swatch is on left side of screen then position left and vica versa
        if (SCREEN_WIDTH / 2 < fx) {
          swatchPosition.value = { right: 0 };
          caretPosition.value = { right: -5 };
        } else {
          swatchPosition.value = { left: 0 };
          caretPosition.value = { left: -5 };
        }
      });
    }
  };


  // shift swatch selector when keyboard shows/hide
  useEffect(() => {
    const keyboardDownSubscription = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        Animated.spring(swatchAnimation, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardUpSubscription = Keyboard.addListener(
      'keyboardWillShow',
      () => {
        Animated.spring(swatchAnimation, {
          toValue: -100,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardUpSubscription.remove();
      keyboardDownSubscription.remove();
    };
  }, []);

  return (
    <>
      <Portal theme={{ colors: { backdrop: 'transparent' } }}>
        <Dialog
          visible={showPalette}
          onDismiss={() => setShowPalette(false)}
          style={[
            styles.dialog,
            { top: swatchLayoutY.current },
            { transform: [{ translateY: swatchAnimation }] },
            { ...swatchPosition.value },
          ]}
        >
          <View style={styles.container}>
            <ScrollView
              persistentScrollbar={true}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.list} onStartShouldSetResponder={() => true}>
                {useMemo(() => {
                  return PATTERN_LIST.map((p) => (
                    <Pattern
                      key={uuid.v4().toString()}
                      name={p}
                      select={setPattern}
                    />
                  ));
                }, [PATTERN_LIST])}
              </View>
            </ScrollView>
          </View>
          <IconButton
            icon='menu-down'
            size={50}
            color='white'
            style={[
              { position: 'absolute', bottom: -47 },
              { ...caretPosition.value },
            ]}
          />
        </Dialog>
      </Portal>
      <Pressable
        ref={swatchRef}
        style={[styles.swatch, { backgroundColor: color }]}
        onPress={openSwatchDialog}
        onLayout={measureSwatch}
      >
        <ImageBackground
          source={Images[pattern]}
          imageStyle={styles.image}
          resizeMode='cover'
        />
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  swatch: {
    height: 40,
    aspectRatio: 1,
    borderRadius: 10,
    margin: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  dialog: {
    height: 150,
    width: 235,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 1,
    position: 'absolute',
  },
  container: {
    flex: 1,
    paddingVertical: 5,
    position: 'relative',
  },
  list: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  image: {
    width: 40,
    height: 40,
    tintColor: 'white',
    opacity: 0.75,
  },
});

export default PatternSelector;