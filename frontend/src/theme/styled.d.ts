import 'styled-components/native';
import { AppTheme } from './colors';

declare module 'styled-components/native' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required shape for styled-components theme augmentation
  export interface DefaultTheme extends AppTheme {}
}
