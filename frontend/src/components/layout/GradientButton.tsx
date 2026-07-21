import { Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import styled from 'styled-components/native';
import { useThemeStore } from '../../store/themeStore';

type Props = { title: string; onPress?: () => void };

export default function GradientButton({ title, onPress }: Props) {
  const { isDark } = useThemeStore();

  const colors: [string, string, string] = isDark
    ? ['#AFE1FF', '#7DD3FC', '#AFE1FF']
    : ['#660029', '#A00046', '#660029'];

  return (
    <Pressable onPress={onPress}>
      <ButtonGradient colors={colors}>
        <ButtonText>{title}</ButtonText>
      </ButtonGradient>
    </Pressable>
  );
}

const ButtonGradient = styled(LinearGradient).attrs({
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  height: 52px;
  border-radius: 14px;
  justify-content: center;
  align-items: center;
`;

const ButtonText = styled(Text)`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;
