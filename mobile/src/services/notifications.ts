import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { pushTokenApi } from './api';

/** Retorna true se o app está rodando dentro do Expo Go (sem suporte a push remoto desde SDK 53) */
const isExpoGo = Constants.appOwnership === 'expo';

// Configuração de como exibir notificações quando o app está em foreground
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldFlashScreen: false,
    }),
  });
}

/**
 * Registra o dispositivo para push notifications e envia o token ao backend.
 * Deve ser chamado após o login do usuário.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push remoto não funciona no Expo Go (SDK 53+)
  if (isExpoGo) {
    console.log('Push notifications não suportadas no Expo Go — use um development build');
    return null;
  }

  // Push notifications só funcionam em dispositivos físicos
  if (!Device.isDevice) {
    console.log('Push notifications requerem dispositivo físico');
    return null;
  }

  // Solicita permissão
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificação negada');
    return null;
  }

  // Android: configura canal de notificação
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    // Envia token ao backend
    await pushTokenApi.register(token);

    return token;
  } catch (err) {
    console.error('Erro ao obter push token:', err);
    return null;
  }
}

/**
 * Remove o push token do backend (ao fazer logout).
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (isExpoGo) return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await pushTokenApi.remove(tokenData.data);
  } catch {
    // ignora erros durante unregister
  }
}
