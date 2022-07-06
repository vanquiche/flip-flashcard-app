import { View, Pressable, StyleSheet } from 'react-native';
import { Title } from 'react-native-paper';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

interface Collection {
  _id: string;
  name: string;
  color: string;
  favorite?: boolean;
  createdAt: string | Date;
  categoryRef?: string;
}

interface Props {
  card: Collection;
  color?: string;
  onPress?: () => void;
}

const FavoriteCard = ({ card, onPress }: Props) => {
  const { user } = useSelector((state: RootState) => state.store);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: user.theme.cardColor }]}
      onPress={onPress}
    >
      <Title style={[styles.textContent, { color: user.theme.fontColor }]}>
        {card.name}
      </Title>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    justifyContent: 'center',
    // width: '45%',
    height: 125,
    aspectRatio: 1.3,
    padding: 15,
    margin: 5,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  textContent: {
    textAlign: 'center',
    color: 'white',
    fontSize: 20,
  },
  cardCount: {
    position: 'absolute',
    color: 'white',
    top: 5,
    right: 10,
  },
});
export default React.memo(FavoriteCard, (prevProps, nextProps) => {
  if (
    prevProps.card.name === nextProps.card.name &&
    prevProps.card?.favorite === nextProps.card?.favorite
  )
    return true;
  return false;
});
