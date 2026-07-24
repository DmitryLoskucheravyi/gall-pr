import { useEffect, useState } from 'react';

import * as ImagePicker from 'expo-image-picker';

import { Image, Pressable, Switch } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { Painting } from '../../types/painting.types';
import { Material, Technique } from '../../types/dictionaries.types';
import { paintingsService } from '../../api/paintings.api';
import { uploadImage } from '../../api/uploads.api';
import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import { Button, TextField, Select } from '../ui';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography, fontFamily } from '../../theme/typography';

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
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(painting?.title ?? '');
  const [description, setDescription] = useState(painting?.description ?? '');
  const [price, setPrice] = useState(painting?.price?.toString() ?? '');
  const [techniqueId, setTechniqueId] = useState<number | undefined>(
    painting?.techniqueId ?? undefined,
  );
  const [materialId, setMaterialId] = useState<number | undefined>(
    painting?.materialId ?? undefined,
  );
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [width, setWidth] = useState(painting?.width?.toString() ?? '');
  const [height, setHeight] = useState(painting?.height?.toString() ?? '');
  const [year, setYear] = useState(painting?.year?.toString() ?? '');
  const [isFeatured, setIsFeatured] = useState(painting?.isFeatured ?? false);
  const [images, setImages] = useState<string[]>(() => {
    if (painting?.images?.length) return painting.images;
    if (painting?.cardImage) return [painting.cardImage];
    return [];
  });

  useEffect(() => {
    materialsService.getMaterials().then(setMaterials);
    techniquesService.getTechniques().then(setTechniques);
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 1,
    });

    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris]);
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((item) => item !== uri));
  };

  const makeCover = (uri: string) => {
    setImages((prev) => [uri, ...prev.filter((item) => item !== uri)]);
  };

  const handleSubmit = async () => {
    try {
      if (images.length === 0 || isLoading) {
        return;
      }

      setIsLoading(true);

      const uploadedUrls = await Promise.all(
        images.map(async (uri) => {
          if (uri.startsWith('http')) return uri;
          const uploadResult = await uploadImage(uri);
          return uploadResult.url;
        }),
      );

      const payload = {
        title,
        description,
        cardImage: uploadedUrls[0],
        images: uploadedUrls,
        price: Number(price),
        isFeatured,
        techniqueId,
        materialId,
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
      setDescription('');
      setPrice('');
      setTechniqueId(undefined);
      setMaterialId(undefined);
      setWidth('');
      setHeight('');
      setYear('');
      setImages([]);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>{painting ? 'Редагування картини' : 'Створення картини'}</Title>

      <PhotosLabel>
        Фото ({images.length}) {images.length > 0 && '— перше є головним'}
      </PhotosLabel>

      <PhotosGrid>
        {images.map((uri, index) => (
          <PhotoThumb key={uri} onPress={() => makeCover(uri)}>
            <ThumbImage source={{ uri }} />

            {index === 0 && (
              <CoverBadge>
                <CoverBadgeText>Головне</CoverBadgeText>
              </CoverBadge>
            )}

            <RemoveButton onPress={() => removeImage(uri)} hitSlop={8}>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </RemoveButton>
          </PhotoThumb>
        ))}

        <AddPhotoButton onPress={pickImages}>
          <Ionicons name="add" size={26} color={theme.textSecondary} />
          <AddPhotoText>Додати</AddPhotoText>
        </AddPhotoButton>
      </PhotosGrid>

      <TextField placeholder="Назва" value={title} onChangeText={setTitle} />
      <TextField
        placeholder="Ціна"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />
      <Select
        placeholder="Техніка"
        value={techniqueId}
        options={techniques}
        onChange={setTechniqueId}
      />
      <Select
        placeholder="Матеріал"
        value={materialId}
        options={materials}
        onChange={setMaterialId}
      />
      <TextField
        placeholder="Ширина"
        keyboardType="numeric"
        value={width}
        onChangeText={setWidth}
      />
      <TextField
        placeholder="Висота"
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />
      <TextField
        placeholder="Рік"
        keyboardType="numeric"
        value={year}
        onChangeText={setYear}
      />
      <TextField
        multiline
        numberOfLines={4}
        placeholder="Опис"
        value={description}
        onChangeText={setDescription}
        style={{ height: 110, textAlignVertical: 'top' }}
      />

      <SwitchRow>
        <Label>Featured</Label>
        <Switch
          value={isFeatured}
          onValueChange={setIsFeatured}
          trackColor={{ true: theme.accent }}
        />
      </SwitchRow>

      <SubmitWrap>
        <Button onPress={handleSubmit} loading={isLoading}>
          {painting ? 'Оновити картину' : 'Створити картину'}
        </Button>
      </SubmitWrap>
    </Container>
  );
}

const Container = styled.View`
  padding-top: ${spacing.sm}px;
`;

const Title = styled.Text`
  margin-bottom: ${spacing.xl}px;
  font-family: ${typography.h2.fontFamily};
  font-size: ${typography.h2.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const SwitchRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: ${spacing.sm}px 0 ${spacing.xl}px;
`;

const Label = styled.Text`
  font-family: ${fontFamily.bodyMedium};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const PhotosLabel = styled.Text`
  margin-bottom: ${spacing.md}px;
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;

const PhotosGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${spacing.md}px;
  margin-bottom: ${spacing.xl}px;
`;

const THUMB_SIZE = 88;

const PhotoThumb = styled(Pressable)`
  width: ${THUMB_SIZE}px;
  height: ${THUMB_SIZE}px;
  border-radius: ${radius.md}px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.backgroundAlt};
`;

const ThumbImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const CoverBadge = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 3px ${spacing.xs}px;
  background-color: ${({ theme }) => `${theme.primary}E6`};
`;

const CoverBadgeText = styled.Text`
  font-family: ${typography.overline.fontFamily};
  font-size: 9px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-align: center;
  color: ${({ theme }) => theme.onPrimary};
`;

const RemoveButton = styled(Pressable)`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.55);
`;

const AddPhotoButton = styled(Pressable)`
  width: ${THUMB_SIZE}px;
  height: ${THUMB_SIZE}px;
  border-radius: ${radius.md}px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-width: 1px;
  border-style: dashed;
  border-color: ${({ theme }) => theme.border};
`;

const AddPhotoText = styled.Text`
  font-family: ${typography.caption.fontFamily};
  font-size: 11px;
  color: ${({ theme }) => theme.textSecondary};
`;

const SubmitWrap = styled.View`
  margin-top: ${spacing.md}px;
`;
