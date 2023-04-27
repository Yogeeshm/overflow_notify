import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {  Pressable } from 'react-native'
import { useState,useEffect,useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

const ESP8266_IP = '192.168.43.137';
const ESP8266_PORT = 80;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [250, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [drainageFlow, setDrainageFlow] = useState(true);
  const [waterLevelPercent, setWaterLevelPercent] = useState(false);
  const [distance, setDistance] = useState(false);
  const [object,setObject]=useState(false)
  
  const normalStyle = {
    fontSize: 36,
    marginTop: 10,
    fontWeight: 'bold',
    color: 'lightgreen',
  };

  const overflowStyle = {
    fontSize: 36,
    marginTop: 10,
    fontWeight: 'bold',
    color: 'red',
  };
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetch(`http://${ESP8266_IP}:${ESP8266_PORT}/root`)
        .then(response => response.text())
        .then(data => {
          console.log(data); 
          const values = data.split(", ").map(val => val.split(": ")[1]);
          const [waterLev, dis] = values;
          setWaterLevelPercent(waterLev);
          setDistance(dis);
          if (waterLev === "99.90%") {
            setDrainageFlow(false);
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Warning',
                body: 'Drainage Overflow has been detected!!!',
              },
              trigger: null, // Send immediately
            });
          } else {
            setDrainageFlow(true);
          }

          if (parseInt(dis) <= 20) {
            Alert.alert("Drainage Blockage Detected");
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Warning',
                body: 'Blockage has been detected!!!',
              },
              trigger: null, // Send immediately
            });
          }
        })
        .catch(error => console.log(error));
    }, 5000);
  
    return () => clearInterval(intervalId);
  }, []);


  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const textStyle = drainageFlow ? normalStyle : overflowStyle;
  
  return (
    <><View style={styles.container}>
    <Text style={{fontSize: 35,
      color: 'black',
      textAlign:'center',fontWeight: 'bold',}}> Drainage Overflow Detection and Control During Flood App </Text>
    </View>
    <View style={styles.container}>
        <Text style={styles.title}>Drainage Flow Status</Text>
        <Text style={textStyle}>{drainageFlow ? 'Normal' : 'Detected Overflow'}</Text>
      </View>  
    <View style={styles.container}>
      <Text style={styles.title}>Water Sensor Detection Level</Text>
      <Text style={styles.Level}>{waterLevelPercent}</Text>
    </View><View style={styles.container}>
        <Text style={styles.title}>Ultrasonic Sensor Value in cm</Text>
        <Text style={styles.Level}>{distance}</Text>
      </View>
      </>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    backgroundColor: 'white',
  },
  buttonText: {
    fontSize: 25,
    color: 'black',
    textAlign:'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  Level: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'black',
    marginTop:10,
  },

});
