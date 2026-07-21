import 'styled-components/native';

declare module 'styled-components/native' {
  export interface DefaultTheme {
    background: string;
    card: string;
    text: string;
    secondaryText: string;
    primary: string;
    primaryText: string;
    border: string;
    error: string;
  }
}
