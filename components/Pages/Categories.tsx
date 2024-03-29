import { View, Text, StyleSheet } from 'react-native';
import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import uuid from 'react-native-uuid';
import { DateTime } from 'luxon';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';

// UTILITIES
import checkDuplicate from '../../utility/checkDuplicate';
import useMarkSelection from '../../hooks/useMarkSelection';
import {
  createPositionList,
  moveObject,
  removeFromPositions,
  addToPositions,
  measureOffset,
  removeManyFromPositions,
  getCardPosition,
  saveCardPosition,
  deleteChildPosition,
  multiDeleteChildPosition,
} from '../../utility/dragAndSort';

// COMPONENTS
import ActionDialog from '../ActionDialog';
import TitleCard from '../TitleCard';
import AlertDialog from '../AlertDialog';
import SwatchSelector from '../SwatchSelector';
import CustomTextInput from '../CustomTextInput';
import ModifcationBar from '../ModifcationBar';
import DragSortList from '../DragSortList';
import DraggableWrapper from '../DraggableWrapper';

// TYPES
import { CardPosition, Category } from '../types';
import { StackNavigationTypes } from '../types';

// REDUX AND CONTEXTS
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import {
  addCategoryCard,
  removeCard,
  updateCard,
} from '../../redux/cardThunkActions';
import { removeFavorite } from '../../redux/storeSlice';
import s from '../styles/styles';
import swatchContext from '../../contexts/swatchContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useRenderCounter from '../../hooks/useRenderCounter';

const SCROLLVIEW_ITEM_HEIGHT = 165;

const INITIAL_STATE: Category = {
  _id: '',
  name: '',
  color: 'tomato',
  createdAt: '',
  type: 'category',
  points: 0,
};

interface Props extends StackNavigationTypes {}

const Categories = ({ navigation }: Props) => {
  const [category, setCategory] = useState(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const animateEntryId = useRef('');

  // view state
  const [editMode, setEditMode] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [sortCardMode, setSortCardMode] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // redux store and contexts
  const { cards } = useSelector((state: RootState) => state.store);
  const dispatch = useDispatch<AppDispatch>();
  const { colors, theme } = useContext(swatchContext);

  // drag and sort values
  const [scrollViewOffset, setScrollViewOffset] = useState(0);
  const cardPosition = useSharedValue(createPositionList(cards.category));
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  // hooks
  const { selection, selectItem, clearSelection } = useMarkSelection();

  const closeDialog = () => {
    setShowDialog(false);
    setTimeout(() => {
      setCategory(INITIAL_STATE);
      setEditMode(false);
    }, 300);
  };

  const addNewCategory = () => {
    closeDialog();
    const exist = checkDuplicate(category.name, 'name', cards.category);

    if (!exist) {
      const id = uuid.v4().toString();
      animateEntryId.current = id;
      const newDoc: Category = {
        _id: id,
        name: category.name,
        color: category.color,
        type: 'category',
        createdAt: DateTime.now().toISO(),
        points: 0,
      };
      // delay adding card until cards have moved into updated position
      cardPosition.value = addToPositions(cardPosition.value, id);
      setTimeout(() => dispatch(addCategoryCard(newDoc)), 200);
    }
  };

  const editCategory = (category: Category) => {
    setCategory({
      ...category,
    });
    setEditMode(true);
    setShowDialog(true);
  };

  const submitEdit = () => {
    const docQuery = { name: category.name, color: category.color };
    dispatch(updateCard({ card: category, query: docQuery }));
    closeDialog();
  };

  const deleteCategory = useCallback((id: string) => {
    dispatch(removeCard({ id, type: 'category' }));
    dispatch(removeFavorite(id));
    deleteChildPosition(id, 'root');
    // delay updating card positions until card has been removed for transition
    setTimeout(() => {
      cardPosition.value = removeFromPositions(cardPosition.value, id);
    }, 100);
  }, []);

  const selectColor = useCallback((color: string) => {
    setCategory((prev) => ({ ...prev, color }));
  }, []);

  const cancelMultiDeletion = () => {
    setMultiSelectMode(false);
    setShowAlert(false);
  };

  const confirmAlert = () => {
    if (selection.length > 0) {
      setShowAlert(true);
    } else {
      cancelMultiDeletion();
    }
  };

  const deleteSelection = useCallback(() => {
    cancelMultiDeletion();
    for (let i = 0; i < selection.length; i++) {
      dispatch(removeCard({ id: selection[i], type: 'category' }));
      dispatch(removeFavorite(selection[i]));
      // when operation is completed then update card positions
      if (i === selection.length - 1) {
        setTimeout(() => {
          cardPosition.value = removeManyFromPositions(
            cardPosition.value,
            selection
          );
        }, 100);
      }
    }
    multiDeleteChildPosition(selection, 'root');
  }, [selection]);

  const startMultiSelectMode = () => {
    clearSelection();
    setMultiSelectMode(true);
  };

  const toggleSortMode = () => {
    setSortCardMode((prev) => !prev);
  };

  const savePositions = () => {
    const list: CardPosition = {
      ref: 'categories',
      type: 'position',
      root: null,
      positions: cardPosition.value,
    };
    saveCardPosition(list);
  };

  useAnimatedReaction(
    () => cardPosition.value,
    (curPositions, prevPositions) => {
      if (!sortCardMode) {
        if (curPositions !== prevPositions) {
          runOnJS(savePositions)();
        }
      }
    },
    [cardPosition.value]
  );

  useEffect(() => {
    async function syncData() {
      const dbPositions = await getCardPosition('categories');
      if (dbPositions) {
        cardPosition.value = dbPositions.positions;
      }
      setIsLoading(false);
    }
    syncData();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* button wrapper */}
      <ModifcationBar
        selections={selection}
        labelColor={theme.fontColor}
        buttonColor={theme.cardColor}
        enableSelection={multiSelectMode}
        disableSelection={cards.category.length === 0}
        clearSelection={clearSelection}
        onPressNew={() => setShowDialog(true)}
        onPressSelect={startMultiSelectMode}
        onConfirmSelection={confirmAlert}
        onSort={toggleSortMode}
        sortMode={sortCardMode}
      />

      <AlertDialog
        visible={showAlert}
        onDismiss={() => setShowAlert(false)}
        onConfirm={deleteSelection}
        message='DELETE SELECTED CATEGORIES?'
      />

      <DragSortList
        scrollViewHeight={cards.category.length * SCROLLVIEW_ITEM_HEIGHT}
        onLayout={(e) => measureOffset(e, setScrollViewOffset)}
        scrollY={scrollY}
      >
        {!isLoading &&
          cards.category.map((category: Category) => {
            return (
              <DraggableWrapper
                key={category._id}
                itemHeight={165}
                itemWidth={100}
                dataLength={cards.category.length}
                id={category._id}
                positions={cardPosition}
                moveObject={moveObject}
                scrollY={scrollY}
                yOffset={scrollViewOffset - insets.top}
                enableTouch={sortCardMode}
                onEnd={savePositions}
              >
                <TitleCard
                  card={category}
                  multiSelect={multiSelectMode}
                  handleEdit={editCategory}
                  markForDelete={selectItem}
                  handleDelete={deleteCategory}
                  selectedForDeletion={selection.includes(category._id)}
                  disableActions={multiSelectMode || sortCardMode}
                  onPress={() => {
                    navigation.navigate('Sets', {
                      categoryRef: category._id,
                      screenTitle: category.name,
                    });
                  }}
                  animateEntry={category._id === animateEntryId.current}
                />
              </DraggableWrapper>
            );
          })}
      </DragSortList>

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
          <CustomTextInput
            style={styles.textInput}
            label='CATEGORY NAME'
            defaultValue={editMode ? category.name : undefined}
            onChange={(name) => setCategory((prev) => ({ ...prev, name }))}
          />

          <SwatchSelector
            color={category.color}
            setColor={selectColor}
            swatches={colors}
          />
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
