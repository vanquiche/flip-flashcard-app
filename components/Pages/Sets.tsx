import { View, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  IconButton,
  TextInput,
  useTheme,
  Button,
  Title,
} from 'react-native-paper';
import React, {
  useState,
  useEffect,
  Suspense,
  useReducer,
  useCallback,
} from 'react';

import Animated from 'react-native-reanimated';

// UTILITIES
import uuid from 'react-native-uuid';
import { DateTime } from 'luxon';
import db from '../../db-services';
import useMarkSelection from '../../hooks/useMarkSelection';
import checkDuplicate from '../../utility/checkDuplicate';
import getData from '../../utility/getData';
// REDUCER

// COMPONENTS
import TitleCard from '../TitleCard';
import ActionDialog from '../ActionDialog';
import AlertDialog from '../AlertDialog';
import SwatchSelector from '../SwatchSelector';
import PatternSelector from '../PatternSelector';

import { Set, StackNavigationTypes } from '../types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import {
  addSetCard,
  getCards,
  removeCard,
  updateCard,
} from '../../redux/cardThunkActions';

import s from '../styles/styles'

const INITIAL_STATE: {
  id: string;
  name: string;
  color: string;
  design: string;
  favorite: boolean;
} = {
  id: '',
  name: '',
  color: 'tomato',
  design: 'default',
  favorite: false,
};

interface Props extends StackNavigationTypes {}

const Sets: React.FC<Props> = ({ navigation, route }) => {
  // data state

  const [cardSet, setCardSet] = useState(INITIAL_STATE);
  // view state
  const [showDialog, setShowDialog] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  // edit state
  const [editMode, setEditMode] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const { selection, selectItem, clearSelection } = useMarkSelection();
  const { categoryRef } = route.params;
  const { colors } = useTheme();

  const { user, cards } = useSelector((state: RootState) => state.store);
  const dispatch = useDispatch<AppDispatch>();

  // console.log(categoryRef)

  // // CRUD functions
  const closeDialog = () => {
    setShowDialog(false);
    setTimeout(() => {
      setEditMode(false);
      setCardSet(INITIAL_STATE);
    }, 300);
  };

  const addNewSet = () => {
    // check for cards with matching names
    const exist = checkDuplicate(cardSet.name, 'name', cards.set);

    // create payload to dispatch into db
    if (!exist) {
      const newSet: Set = {
        _id: uuid.v4().toString(),
        type: 'set',
        name: cardSet.name,
        color: cardSet.color,
        design: cardSet.design,
        favorite: cardSet.favorite,
        createdAt: DateTime.now().toISO(),
        categoryRef: categoryRef,
      };
      dispatch(addSetCard(newSet));

      closeDialog();
    }
  };

  const deleteSet = (id: string) => {
    dispatch(removeCard({ id, type: 'set' }));
  };

  const editSet = (set: Set) => {
    // place selected card into current state of set
    setCardSet({
      id: set._id,
      name: set.name,
      color: set.color,
      design: set.design,
      favorite: set.favorite,
    });
    // turn on edit mode to switch function of action dialog
    setEditMode(true);
    setShowDialog(true);
  };

  const submitEdit = () => {
    // submit update to dispatch
    const docQuery = {
      name: cardSet.name,
      color: cardSet.color,
      design: cardSet.design,
      favorite: cardSet.favorite,
    };
    dispatch(updateCard({ id: cardSet.id, type: 'set', query: docQuery }));

    closeDialog();
  };

  const cancelMultiDeletion = () => {
    setMultiSelectMode(false);
    setShowAlert(false);
  };

  const confirmAlert = () => {
    if (selection.current.length > 0) {
      setShowAlert(true);
    } else {
      cancelMultiDeletion();
    }
  };

  const deleteSelection = () => {
    // cycle through selection and delete each ID
    for (let i = 0; i < selection.current.length; i++) {
      dispatch(removeCard({ id: selection.current[i], type: 'set' }));
    }
    cancelMultiDeletion();
  };

  const selectPattern = useCallback((design) => {
    setCardSet((prev) => ({ ...prev, design }));
  }, []);

  const selectColor = useCallback((color) => {
    setCardSet((prev) => ({ ...prev, color }));
  }, []);

  useEffect(() => {
    // find cards within the parent category
    dispatch(
      getCards({
        type: 'set',
        query: { type: 'set', categoryRef: categoryRef },
      })
    );
  }, [categoryRef]);

  useEffect(() => {
    // set title of screen to category name
    db.find({ _id: categoryRef }, (err: Error, docs: any) => {
      if (err) console.log(err);
      navigation.setOptions({
        title: docs[0].name.toUpperCase(),
      });
    });
  }, [categoryRef]);

  return (
    <View>
      {/* ACTION BUTTONS */}
      <View style={s.cardButtonWrapper}>
        {!multiSelectMode ? (
          <>
            <Button
              mode='contained'
              style={s.cardActionButton}
              color={user.theme.cardColor}
              labelStyle={{ color: user.theme.fontColor }}
              onPress={() => setShowDialog(true)}
            >
              NEW
            </Button>

            {/* start mode to mark for deletion */}

            <Button
              mode='contained'
              style={s.cardActionButton}
              color={user.theme.cardColor}
              labelStyle={{ color: user.theme.fontColor }}
              onPress={() => {
                clearSelection();
                setMultiSelectMode(true);
              }}
              disabled={cards.set.length === 0}
            >
              DELETE
            </Button>
          </>
        ) : (
          <Button
            mode='text'
            color='tomato'
            onPress={confirmAlert}
            style={[s.cardActionButton, { position: 'absolute', right: 12 }]}
          >
            REMOVE
          </Button>
        )}
      </View>

      {/* ALERT USER OF DELETION */}
      <AlertDialog
        visible={showAlert}
        onDismiss={() => setShowAlert(false)}
        onConfirm={deleteSelection}
        message='DELETE SELECTED SETS?'
      />

      <Suspense fallback={<ActivityIndicator size='large' />}>
        <ScrollView>
          <View
            style={s.cardListContainer}
          >
            {cards.set.map((set: Set) => {
              return (
                <TitleCard
                  key={set._id}
                  card={set}
                  multiSelect={multiSelectMode}
                  handleEdit={editSet}
                  markForDelete={selectItem}
                  handleDelete={deleteSet}
                  onPress={() =>
                    navigation.navigate('Cards', {
                      color: set.color,
                      setRef: set._id,
                      design: set.design,
                      categoryRef: categoryRef,
                    })
                  }
                />
              );
            })}
          </View>
        </ScrollView>
      </Suspense>

      {/* ADD/EDIT CATEGORY DIALOG */}
      <ActionDialog
        visible={showDialog}
        dismiss={() => setShowDialog(false)}
        title={editMode ? 'EDIT SET' : 'NEW SET'}
        onCancel={closeDialog}
        onSubmit={editMode ? submitEdit : addNewSet}
        disableSubmit={cardSet.name ? false : true}
      >
        <TextInput
          mode='outlined'
          label='SET NAME'
          outlineColor='grey'
          activeOutlineColor='black'
          maxLength={32}
          style={{ height: 40, margin: 0 }}
          value={cardSet.name}
          onChangeText={(name) => setCardSet((prev) => ({ ...prev, name }))}
        />
        <View
          style={[s.actionDialogChildrenContainer, {marginTop: 15}]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SwatchSelector color={cardSet.color} setColor={selectColor} />
            <Title style={{ color: user.theme.fontColor, marginLeft: 10 }}>
              COLOR
            </Title>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Title style={{ color: user.theme.fontColor, marginRight: 10 }}>
              DESIGN
            </Title>
            <PatternSelector
              setPattern={selectPattern}
              pattern={cardSet.design}
              color={cardSet.color}
            />
          </View>
        </View>

        <IconButton
          size={30}
          color='yellow'
          style={{
            margin: 0,
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 10,
          }}
          icon={cardSet.favorite ? 'star' : 'star-outline'}
          onPress={() =>
            setCardSet((prev) => ({ ...prev, favorite: !prev.favorite }))
          }
        />
      </ActionDialog>
    </View>
  );
};

const styles = StyleSheet.create({

});

export default Sets;
