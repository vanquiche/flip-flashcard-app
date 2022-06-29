import { View, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import {
  Button,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import React, {
  useState,
  useReducer,
  useEffect,
  Suspense,
  useCallback,
  useMemo,
} from 'react';
import uuid from 'react-native-uuid';
import { DateTime } from 'luxon';

// UTILITIES
import checkDuplicate from '../../utility/checkDuplicate';
import useMarkSelection from '../../hooks/useMarkSelection';
import getData from '../../utility/getData';
import * as Haptics from 'expo-haptics';

// COMPONENTS
import ActionDialog from '../ActionDialog';
import TitleCard from '../TitleCard';
import AlertDialog from '../AlertDialog';
import SwatchSelector from '../SwatchSelector';

// TYPES
import { Category, Set } from '../types';
import { StackNavigationTypes } from '../types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import {
  addCategoryCard,
  getCards,
  removeCard,
  updateCard,
} from '../../redux/cardThunkActions';
import { checkLogin } from '../../redux/userThunkActions';
import { removeFavorite } from '../../redux/storeSlice';
import s from '../styles/styles';

const INITIAL_STATE: { id: string; name: string; color: string } = {
  id: '',
  name: '',
  color: 'tomato',
};

interface Props extends StackNavigationTypes {}

const Categories: React.FC<Props> = ({ navigation, route }) => {
  const [category, setCategory] = useState(INITIAL_STATE);
  // view state
  const [showDialog, setShowDialog] = useState(false);
  // const [showSwatch, setShowSwatch] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  // edit state
  const [editMode, setEditMode] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const { colors } = useTheme();
  const { selection, selectItem, clearSelection } = useMarkSelection();

  const { user, cards } = useSelector((state: RootState) => state.store);

  const dispatch = useDispatch<AppDispatch>();

  const closeDialog = () => {
    setShowDialog(false);
    setTimeout(() => {
      setCategory(INITIAL_STATE);
      setEditMode(false);
    }, 300);
  };

  const addNewCategory = () => {
    const exist = checkDuplicate(category.name, 'name', cards.category);

    if (!exist) {
      const newDoc: Category = {
        _id: uuid.v4().toString(),
        name: category.name,
        color: category.color,
        type: 'category',
        createdAt: DateTime.now().toISO(),
        points: 0,
      };

      dispatch(addCategoryCard(newDoc));
    }
    closeDialog();
  };

  const editCategory = (category: Category | Set) => {
    setCategory({
      id: category._id,
      name: category.name,
      color: category.color,
    });
    setEditMode(true);
    setShowDialog(true);
  };

  const submitEdit = () => {
    const docQuery = { name: category.name, color: category.color };
    dispatch(
      updateCard({ id: category.id, type: 'category', query: docQuery })
    );
    closeDialog();
  };

  const deleteCategory = (id: string) => {
    dispatch(removeCard({ id, type: 'category' }));
    dispatch(removeFavorite(id));
  };

  const selectColor = useCallback((color: string) => {
    setCategory((prev) => ({ ...prev, color }));
  }, []);

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
      dispatch(removeCard({ id: selection.current[i], type: 'category' }));
      dispatch(removeFavorite(selection.current[i]));
    }
    cancelMultiDeletion();
  };

  return (
    <View>
      {/* button wrapper */}
      <View style={[s.cardButtonWrapper]}>
        {!multiSelectMode ? (
          <>
            <Button
              mode='contained'
              style={s.cardActionButton}
              labelStyle={[{ color: user.theme.fontColor }]}
              color={user.theme.cardColor}
              onPress={() => setShowDialog(true)}
            >
              NEW
            </Button>

            <Button
              mode='contained'
              style={s.cardActionButton}
              labelStyle={[{ color: user.theme.fontColor }]}
              color={user.theme.cardColor}
              onPress={() => {
                clearSelection();
                setMultiSelectMode(true);
              }}
              disabled={cards.category.length === 0}
            >
              DELETE
            </Button>
          </>
        ) : (
          <Button
            mode='text'
            style={[s.cardActionButton, { position: 'absolute', right: 12 }]}
            color='tomato'
            onPress={confirmAlert}
          >
            REMOVE
          </Button>
        )}
      </View>

      <AlertDialog
        visible={showAlert}
        onDismiss={() => setShowAlert(false)}
        onConfirm={deleteSelection}
        message='DELETE SELECTED CATEGORIES?'
      />

      <Suspense fallback={<ActivityIndicator size='large' />}>
        <ScrollView>
          <View style={s.cardListContainer}>
            {cards.category?.map((category: Category) => {
              return (
                <TitleCard
                  key={category._id}
                  card={category}
                  multiSelect={multiSelectMode}
                  handleEdit={editCategory}
                  markForDelete={selectItem}
                  handleDelete={deleteCategory}
                  onPress={() => {
                    navigation.navigate('Sets', {
                      categoryRef: category._id,
                    });
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      </Suspense>

      {/* ADD NEW CATEGORY DIALOG */}
      <ActionDialog
        visible={showDialog}
        dismiss={() => setShowDialog(false)}
        title={editMode ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
        onCancel={closeDialog}
        onSubmit={editMode ? submitEdit : addNewCategory}
        disableSubmit={category.name ? false : true}
      >
        <View style={s.actionDialogChildrenContainer}>
          <TextInput
            mode='outlined'
            label='CATEGORY NAME'
            outlineColor='grey'
            activeOutlineColor='black'
            maxLength={32}
            value={category.name}
            onChangeText={(name) => setCategory((prev) => ({ ...prev, name }))}
            style={styles.textInput}
          />

          <SwatchSelector color={category.color} setColor={selectColor} />
        </View>
      </ActionDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  textInput: {
    width: '80%',
    height: 40,
    margin: 0,
    marginBottom: 6,
  },
});

export default Categories;
