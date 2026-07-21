import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';

import { ActivityIndicator, Image, Switch } from 'react-native';
import styled from 'styled-components/native';
import { Painting } from '../../types/painting.types';
import { paintingsService } from '../../api/paintings.api';
import { uploadImage } from '../../api/uploads.api';

type Props = {
  onCreated: () => void;
  onClose?: () => void;
  painting?: Painting;
};

export default function CreatePaintingForm({
  onCreated,
  onClose,
  painting,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(painting?.title ?? '');

  const [author, setAuthor] = useState(painting?.author ?? '');

  const [description, setDescription] = useState(painting?.description ?? '');

  const [price, setPrice] = useState(painting?.price?.toString() ?? '');

  const [discount, setDiscount] = useState(
    painting?.discount?.toString() ?? '',
  );

  const [technique, setTechnique] = useState(painting?.technique ?? '');

  const [material, setMaterial] = useState(painting?.material ?? '');

  const [width, setWidth] = useState(painting?.width?.toString() ?? '');

  const [height, setHeight] = useState(painting?.height?.toString() ?? '');

  const [year, setYear] = useState(painting?.year?.toString() ?? '');

  const [isFeatured, setIsFeatured] = useState(painting?.isFeatured ?? false);

  const [image, setImage] = useState<string | null>(
    painting?.cardImage ?? null,
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,

      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!image || isLoading) {
        return;
      }

      setIsLoading(true);

      let imageUrl = image;

      if (image && !image.startsWith('http')) {
        const uploadResult = await uploadImage(image);

        imageUrl = uploadResult.url;
      }

      const payload = {
        title,
        author,
        description,
        cardImage: imageUrl,
        images: [imageUrl],
        price: Number(price),
        discount: Number(discount) || 0,
        isFeatured,
        technique,
        material,
        width: Number(width) || 0,
        height: Number(height) || 0,
        year: Number(year) || 0,
      };

      if (painting) {
        await paintingsService.updatePainting(painting.id, payload);
      } else {
        await paintingsService.createPainting(payload);
      }

      onCreated();
      if (onClose) {
        onClose();
      }

      setTitle('');
      setAuthor('');
      setDescription('');
      setPrice('');
      setTechnique('');
      setMaterial('');
      setWidth('');
      setHeight('');
      setYear('');
      setDiscount('');
      setImage(null);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>Створення картини</Title>
      <Input placeholder="Назва" value={title} onChangeText={setTitle} />

      <Input placeholder="Автор" value={author} onChangeText={setAuthor} />

      <Input
        placeholder="Ціна"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      <Input
        placeholder="Техніка"
        value={technique}
        onChangeText={setTechnique}
      />

      <Input
        placeholder="Матеріал"
        value={material}
        onChangeText={setMaterial}
      />

      <Input
        placeholder="Ширина"
        keyboardType="numeric"
        value={width}
        onChangeText={setWidth}
      />

      <Input
        placeholder="Висота"
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />

      <Input
        placeholder="Рік"
        keyboardType="numeric"
        value={year}
        onChangeText={setYear}
      />

      <Input
        placeholder="Знижка"
        keyboardType="numeric"
        value={discount}
        onChangeText={setDiscount}
      />

      <DescriptionInput
        multiline
        placeholder="Опис"
        value={description}
        onChangeText={setDescription}
      />

      <SwitchRow>
        <Label>Featured</Label>

        <Switch value={isFeatured} onValueChange={setIsFeatured} />
      </SwitchRow>

      <PickButton onPress={pickImage}>
        <ButtonText>Обрати фото</ButtonText>
      </PickButton>

      {image && <Preview source={{ uri: image }} />}

      <CreateButton disabled={isLoading} onPress={handleSubmit}>
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <ButtonText>Завантаження...</ButtonText>
          </>
        ) : (
          <ButtonText>
            {painting ? 'Оновити картину' : 'Створити картину'}
          </ButtonText>
        )}
      </CreateButton>
    </Container>
  );
}

const Container = styled.View`
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 10px;
  elevation: 5;
`;

const Title = styled.Text`
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const Input = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.secondaryText,
}))`
  margin-bottom: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const DescriptionInput = styled(Input)`
  height: 120px;
  text-align-vertical: top;
`;

const SwitchRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 16px;
`;

const Label = styled.Text`
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
`;

const PickButton = styled.Pressable`
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background-color: ${({ theme }) =>
    theme.background === '#EFFDFF' ? '#DC2626' : '#991B1B'};
`;

const CreateButton = styled.Pressable`
  height: 56px;
  margin-top: 16px;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.primary};
`;

const ButtonText = styled.Text`
  font-size: 16px;
  font-weight: 600;

  color: ${({ theme }) => theme.primaryText};
`;

const Preview = styled(Image)`
  width: 100%;
  height: 240px;
  margin-top: 16px;
  border-radius: 16px;
`;
