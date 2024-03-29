import { View, StyleSheet } from 'react-native';
import { IconButton, Title } from 'react-native-paper';
import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

// UTILITIES
import uuid from 'react-native-uuid';
import { DateTime } from 'luxon';
import useMarkSelection from '../../hooks/useMarkSelection';
import checkDuplicate from '../../utility/checkDuplicate';
// REDUCER

// COMPONENTS
import TitleCard from '../TitleCard';
import ActionDialog from '../ActionDialog';
import AlertDialog from '../AlertDialog';
import SwatchSelector from '../SwatchSelector';
import PatternSelector from '../PatternSelector';
import DraggableWrapper from '../DraggableWrapper';
import DragSortList from '../DragSortList';

import { CardPosition, Set, StackNavigationTypes } from '../types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import {
  addSetCard,
  getCards,
  removeCard,
  updateCard,
} from '../../redux/cardThunkActions';

import s from '../styles/styles';
import swatchContext from '../../contexts/swatchContext';
import CustomTextInput from '../CustomTextInput';
import ModifcationBar from '../ModifcationBar';
import { useSharedValue } from 'react-native-reanimated';
import {
  addToPositions,
  deleteChildPosition,
  measureOffset,
  moveObject,
  multiDeleteChildPosition,
  removeFromPositions,
  removeManyFromPositions,
  saveCardPosition,
} from '../../utility/dragAndSort';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

const SCROLLVIEW_ITEM_HEIGHT = 170;

const INITIAL_STATE: Set = {
  _id: '',
  name: '',
  color: 'tomato',
  design: 'default',
  favorite: false,
  type: 'set',
  createdAt: '',
  categoryRef: '',
};

interface Props extends StackNavigationTypes {}

const Sets = ({ navigation, route }: Props) => {
  const animateEntryId = useRef('');
  const { categoryRef, screenTitle } = route.params;
  const [cardSet, setCardSet] = useState(INITIAL_STATE);

  // view state
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [sortMode, setSortMode] = useState(false);

  const { cards } = useSelector((state: RootState) => state.store);
  const dispatch = useDispatch<AppDispatch>();
  const { colors, patterns, theme } = useContext(swatchContext);

  // drag and sort values
  const [scrollViewOffset, setScrollViewOffset] = useState(0);
  const cardPosition = useSharedValue({});
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  // hooks
  const { selection, selectItem, clearSelection } = useMarkSelection();

  // CRUD functions
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
      closeDialog();
      const id = uuid.v4().toString();
      animateEntryId.current = id;
      const newSet: Set = {
        _id: id,
        type: 'set',
        name: cardSet.name,
        color: cardSet.color,
        design: cardSet.design,
        favorite: cardSet.favorite,
        createdAt: DateTime.now().toISO(),
        categoryRef: categoryRef,
      };
      cardPosition.value = addToPositions(cardPosition.value, id);
      // delay dispatch until cards have moved into their new positions
      setTimeout(() => dispatch(addSetCard(newSet)), 200);
    }
  };

  const deleteSet = (id: string) => {
    dispatch(removeCard({ id, type: 'set' }));
    // once card has been removed then update positions for smooth transition
    setTimeout(() => {
      cardPosition.value = removeFromPositions(cardPosition.value, id);
    }, 300);
    deleteChildPosition(id, 'ref');
  };

  const editSet = (set: Set) => {
    // place selected card into current state of set
    setCardSet({
      ...set,
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
    dispatch(updateCard({ card: cardSet, query: docQuery }));

    closeDialog();
  };

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
      dispatch(removeCard({ id: selection[i], type: 'set' }));
      // once operation has complete, update positions for smooth transition
      if (i === selection.length - 1) {
        setTimeout(() => {
          cardPosition.value = removeManyFromPositions(
            cardPosition.value,
            selection
          );
        }, 100);
      }
    }
    multiDeleteChildPosition(selection, 'ref');
  }, [selection]);

  const selectPattern = useCallback((design) => {
    setCardSet((prev) => ({ ...prev, design }));
  }, []);

  const selectColor = useCallback((color) => {
    setCardSet((prev) => ({ ...prev, color }));
  }, []);

  const startMultiSelectMode = () => {
    clearSelection();
    setMultiSelectMode(true);
  };

  const toggleSortMode = () => {
    setSortMode((prev) => !prev);
  };

  const savePositions = () => {
    const list: CardPosition = {
      ref: categoryRef,
      type: 'position',
      root: categoryRef,
      positions: cardPosition.value,
    };
    saveCardPosition(list);
  };

  useAnimatedReaction(
    () => cardPosition.value,
    (curPositions, prevPositions) => {
      if (!isLoading && !sortMode) {
        if (curPositions !== prevPositions) {
          runOnJS(savePositions)();
        }
      }
    },
    [cardPosition.value]
  );

  useEffect(() => {
    async function syncData() {
      navigation.setOptions({
        title: screenTitle,
      });
      const data: any = await dispatch(
        getCards({
          type: 'set',
          query: { type: 'set', categoryRef: categoryRef },
        })
      );
      cardPosition.value = data.payload.positions;
      setIsLoading(false);
    }
    syncData();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* ACTION BUTTONS */}
      <ModifcationBar
        buttonColor={theme.cardColor}
        labelColor={theme.fontColor}
        selections={selection}
        enableSelection={multiSelectMode}
        disableSelection={cards.set.length === 0}
        clearSelection={clearSelection}
        onPressNew={() => setShowDialog(true)}
        onPressSelect={startMultiSelectMode}
        onConfirmSelection={confirmAlert}
        onSort={toggleSortMode}
        sortMode={sortMode}
      />

      {/* ALERT USER OF DELETION */}
      <AlertDialog
        visible={showAlert}
        onDismiss={() => setShowAlert(false)}
        onConfirm={deleteSelection}
        message='DELETE SELECTED SETS?'
      />

      <DragSortList
        scrollY={scrollY}
        scrollViewHeight={cards.set.length * SCROLLVIEW_ITEM_HEIGHT}
        onLayout={(e) => measureOffset(e, setScrollViewOffset)}
      >
        {!isLoading &&
          cards.set.map((set: Set) => {
            return (
              <DraggableWrapper
                key={set._id}
                itemHeight={165}
                itemWidth={100}
                dataLength={cards.set.length}
                id={set._id}
                positions={cardPosition}
                moveObject={moveObject}
                scrollY={scrollY}
                yOffset={scrollViewOffset - insets.top}
                enableTouch={sortMode}
                onEnd={savePositions}
              >
                <TitleCard
                  key={set._id}
                  card={set}
                  multiSelect={multiSelectMode}
                  handleEdit={editSet}
                  markForDelete={selectItem}
                  handleDelete={deleteSet}
                  selectedForDeletion={selection.includes(set._id)}
                  disableActions={multiSelectMode || sortMode}
                  onPress={() =>
                    navigation.navigate('Cards', {
                      color: set.color,
                      setRef: set._id,
                      design: set.design,
                      categoryRef: categoryRef,
                      screenTitle: set.name,
                    })
                  }
                  animateEntry={animateEntryId.current === set._id}
                />
              </DraggableWrapper>
            );
          })}
      </DragSortList>

      {/* ADD/EDIT CATEGORY DIALOG */}
      <ActionDialog
        visible={showDialog}
        dismiss={() => setShowDialog(false)}
        title={editMode ? 'EDIT SET' : 'NEW SET'}
        onCancel={closeDialog}
        onSubmit={editMode ? submitEdit : addNewSet}
        disableSubmit={cardSet.name ? false : true}
      >
        <CustomTextInput
          label='SET NAME'
          style={styles.textInput}
          defaultValue={editMode ? cardSet.name : undefined}
          onChange={(name) => setCardSet((prev) => ({ ...prev, name }))}
        />
        <View style={[s.actionDialogChildrenContainer, { marginTop: 15 }]}>
          <View style={styles.swatchContainer}>
            <SwatchSelector
              color={cardSet.color}
              setColor={selectColor}
              swatches={colors}
            />
            <Title style={{ color: theme.fontColor, marginLeft: 10 }}>
              COLOR
            </Title>
          </View>

          <View style={styles.swatchContainer}>
            <Title style={{ color: theme.fontColor, marginRight: 10 }}>
              DESIGN
            </Title>
            <PatternSelector
              setPattern={selectPattern}
              pattern={cardSet.design}
              color={cardSet.color}
              patternList={patterns}
            />
          </View>
        </View>

        <IconButton
          size={30}
          color='white'
          style={styles.favicon}
          icon={cardSet.favorite ? 'heart' : 'heart-outline'}
          onPress={() =>
            setCardSet((prev) => ({ ...prev, favorite: !prev.favorite }))
          }
          accessibilityRole='imagebutton'
          accessibilityLabel={cardSet.favorite ? 'favorited' : 'not favorited'}
          accessibilityHint='toggle favorite'
        />
      </ActionDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  favicon: {
    margin: 0,
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  swatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    height: 40,
    margin: 0,
  },
});

export default Sets;
