import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    // Add event listener for hardware back button press on Android
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handler
    );

    // Clean up the event listener when the component unmounts
    return () => backHandler.remove();
  }, [handler]);
}
