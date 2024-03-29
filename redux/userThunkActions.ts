import { createAsyncThunk } from '@reduxjs/toolkit';
import { Category, Set, User } from '../components/types';
import db from '../db-services';
import { DateTime } from 'luxon';
import loginStreak from '../utility/loginStreak';
import sortWeek from '../utility/sortWeek';
import checkDate from '../utility/checkDate';

export const createNewUser = createAsyncThunk(
  'user/createUser',
  (newUser: any) => {
    return new Promise<User>((resolve, reject) => {
      db.insert(newUser, (err: Error, newDoc: User) => {
        if (err) reject(err.message);
        resolve(newDoc);
      });
    });
  }
);

export const getUserData = createAsyncThunk('store/getUser', () => {
  return new Promise<User>((resolve, reject) => {
    db.find({ type: 'user' }, (err: Error, docs: User[]) => {
      if (err) reject(err.message);
      if (docs.length > 0) resolve(docs[0]);
    });
  });
});

export const deleteUser = createAsyncThunk('store/deleteCurrentUser', () => {
  return new Promise<void>((resolve, reject) => {
    db.remove({}, { multi: true }, (err: Error, numRemoved: number) => {
      if (err) reject(err.message);
      resolve();
    });
  });
});

export const updateUser = createAsyncThunk(
  'store/updateUserByField',
  (update: Object) => {
    return new Promise<Object>((resolve, reject) => {
      db.update(
        { type: 'user' },
        { $set: update },
        (err: Error, numRemoved: number) => {
          if (err) reject(err.message);
          resolve(update);
        }
      );
    });
  }
);

interface LoginObject {
  login: string[];
  streak: number;
  heartcoin: number;
  completedQuiz: [];
  inStreak: boolean;
}

export const checkLogin = createAsyncThunk(
  'store/checkLogin',
  (payload: { login: string[]; streak: number; heartcoin: number }) => {
    return new Promise<void | LoginObject>((resolve, reject) => {
      const loggedInLast = payload.login[payload.login.length - 1];

      const updatedWeek = sortWeek(payload.login);
      // check if user is in streak
      const inStreak = loginStreak(loggedInLast);
      // if user is in streak then increment
      // coins and streak count
      const coins = inStreak ? payload.heartcoin + 5 : payload.heartcoin;
      const streak = inStreak ? payload.streak + 1 : 1;

      const updateData: LoginObject = {
        streak: streak,
        heartcoin: coins,
        completedQuiz: [],
        login: updatedWeek,
        inStreak: inStreak ? true : false,
      };

      db.update(
        { type: 'user' },
        {
          $set: updateData,
        },
        (err: Error, numReplaced: number) => {
          if (err) reject(err);
          // if (err) console.log(err)
          resolve(updateData);
        }
      );
    });
  }
);

export const completeQuiz = createAsyncThunk(
  'store/markSetComplete',
  (setRef: string) => {
    return new Promise<string>((resolve, reject) => {
      db.update(
        { type: 'user' },
        { $push: { completedQuiz: { setRef } } },
        (err: Error, numRemoved: number) => {
          if (err) reject(err.message);
          resolve(setRef);
        }
      );
    });
  }
);

export const hydrateData = createAsyncThunk('store/hydrateData', () => {
  return new Promise<{
    user: User;
    favorites: Set[];
    categoryCards: Category[];
  }>(async (resolve, reject) => {
    let data: any = {};
    try {
      await db.findOne({ type: 'user' }, (err: Error, doc: any) => {
        if (doc) data.user = doc;
      });
      await db.find(
        { type: 'set', favorite: true },
        (err: Error, docs: any[]) => {
          if (docs) data.favorites = docs;
        }
      );
      await db.find({ type: 'category' }, (err: Error, docs: any[]) => {
        if (docs) data.categoryCards = docs;
      });
    } catch (err: any) {
      reject(err);
    } finally {
      resolve(data);
    }
  });
});
