import { useEffect, useState } from 'react';
import { Image } from 'react-native';

export function useImageAspectRatio(uri: string | undefined, fallback = 1) {
  const [aspectRatio, setAspectRatio] = useState(fallback);

  useEffect(() => {
    if (!uri) return;

    let isMounted = true;

    Image.getSize(
      uri,
      (width, height) => {
        if (isMounted && width > 0 && height > 0) {
          setAspectRatio(width / height);
        }
      },
      () => {},
    );

    return () => {
      isMounted = false;
    };
  }, [uri]);

  return aspectRatio;
}
