import BottomMenu from '../../navigation/BottomMenu';
import Header from './Header';

type Props = { children: React.ReactNode; hideHeader?: boolean };

export default function AppLayout({ children, hideHeader }: Props) {
  return (
    <>
      {!hideHeader && <Header />}
      {children}
      <BottomMenu />
    </>
  );
}
