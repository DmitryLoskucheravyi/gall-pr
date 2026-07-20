import { useState } from "react";

import * as ImagePicker from "expo-image-picker";

import { ActivityIndicator, Image, Switch } from "react-native";

import {
  Container,
  Title,
  Input,
  DescriptionInput,
  SwitchRow,
  Label,
  PickButton,
  CreateButton,
  ButtonText,
  Preview,
  StyledSwitch,
} from "./CreatePaintingForm.styles";

import { Painting } from "../../types/painting.types";
import { createPainting, updatePainting } from "../../api/paintings.api";
import { uploadImage } from "../../api/uploads.api";

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
  const [title, setTitle] = useState(painting?.title ?? "");

  const [author, setAuthor] = useState(painting?.author ?? "");

  const [description, setDescription] = useState(painting?.description ?? "");

  const [price, setPrice] = useState(painting?.price?.toString() ?? "");

  const [discount, setDiscount] = useState(
    painting?.discount?.toString() ?? "",
  );

  const [technique, setTechnique] = useState(painting?.technique ?? "");

  const [material, setMaterial] = useState(painting?.material ?? "");

  const [width, setWidth] = useState(painting?.width?.toString() ?? "");

  const [height, setHeight] = useState(painting?.height?.toString() ?? "");

  const [year, setYear] = useState(painting?.year?.toString() ?? "");

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

      if (image && !image.startsWith("http")) {
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
        await updatePainting(painting.id, payload);
      } else {
        await createPainting(payload);
      }

      onCreated();

      if (onClose) {
        onClose();
      }

      setTitle("");
      setAuthor("");
      setDescription("");
      setPrice("");
      setTechnique("");
      setMaterial("");
      setWidth("");
      setHeight("");
      setYear("");
      setDiscount("");
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

      {image && (
        <Preview
          source={{
            uri: image,
          }}
        />
      )}

      <CreateButton disabled={isLoading} onPress={handleSubmit}>
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <ButtonText>Завантаження...</ButtonText>
          </>
        ) : (
          <ButtonText>
            {painting ? "Оновити картину" : "Створити картину"}
          </ButtonText>
        )}
      </CreateButton>
    </Container>
  );
}
