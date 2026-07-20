import styled from "styled-components/native";

export const HeaderContainer = styled.View`
  width: 100%;
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 10px;

  background-color: ${({ theme }) => theme.background};
`;
export const HeaderLayout = styled.View`
  width: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const IconContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 20px;
`;
