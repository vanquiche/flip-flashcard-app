import { View, StyleSheet, KeyboardAvoidingView } from 'react-native';
import React, { useState } from 'react';

import { Title, Text, TextInput, useTheme, Button } from 'react-native-paper';
import { StackNavigationTypes, defaultTheme } from '../types';
import { DateTime } from 'luxon';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/store';
import { createNewUser } from '../../redux/userThunkActions';

const SignUp = () => {
  const [newUser, setNewUser] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const dt = DateTime;

  const { colors } = useTheme();

  const createUser = () => {
    const createUser = {
      type: 'user',
      username: newUser ? newUser : 'user',
      xp: 0,
      heartcoin: 75,
      achievements: [],
      completedQuiz: [],
      login: [dt.now().toISO()],
      streak: 0,
      theme: defaultTheme,
      stats: [],
      collection: {
        themes: [],
        colors: [],
        patterns: {},
      },
    };
    dispatch(createNewUser(createUser));
  };

  return (
    <KeyboardAvoidingView
      behavior='padding'
      style={[styles.container, { backgroundColor: colors.primary }]}
    >
      <View style={[]}>
        <Title
          style={{ textAlign: 'center', color: colors.secondary, fontSize: 22 }}
          accessibilityRole='text'
          accessibilityLabel='create your account'
        >
          CREATE YOUR ACCOUNT
        </Title>

        <TextInput
          label='USER NAME'
          mode='outlined'
          style={styles.input}
          outlineColor='transparent'
          activeOutlineColor={colors.secondary}
          maxLength={32}
          value={newUser}
          onChangeText={(text) =>
            setNewUser(text)
          }
        />

        <Button
          mode='contained'
          style={styles.button}
          color={colors.secondary}
          labelStyle={{ color: 'white', fontSize: 16 }}
          onPress={createUser}
          disabled={
            !newUser || newUser.length < 3
          }
          accessibilityRole='button'
          accessibilityLabel='create'
          accessibilityHint='confirm and create new user'
        >
          CREATE
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'center',
  },
  input: {
    marginVertical: 10,
  },
  icon: {
    height: 125,
    aspectRatio: 1,
    backgroundColor: 'tomato',
    borderRadius: 65,
    margin: 10,
    alignSelf: 'center',
  },
  button: {
    elevation: 0,
    padding: 8,
    marginVertical: 15,
  },
});

export default SignUp;
