import { CameraView, useCameraPermissions } from 'expo-camera';

import { useRouter } from "expo-router";

import { useRef, useState } from 'react';
import { Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Journal() {

    const router = useRouter();

  const [facing, setFacing] = useState('back');


  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef(null);
  const [photoUri, setPhotoUri] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTaking, setIsTaking] = useState(false);

  if (!permission) {
  return <View />;
    }

if (!permission.granted) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        We need your permission to show the camera
      </Text>
      <Button onPress={requestPermission} title="Grant Permission" />
    </View>
  );
}

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const takePicture = async () => {
  if (!cameraRef.current || isTaking) return;
  setIsTaking(true);

  try {
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    setPhotoUri(photo.uri);
  } finally {
    setIsTaking(false);
  }
};

const onBackPress = () => router.back();

  return (

    

    <View style={styles.container}>

        <View style={styles.topRow}>
          <TouchableOpacity
                style={styles.previewButton}
                onPress={() => {
                  onBackPress()
                }}
              >
                <Text style={styles.text}>← Back</Text>
              </TouchableOpacity>
        </View>

      <CameraView

  
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />

       {/* {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={styles.photoPreview}
          />
        )} */}

         {photoUri && !isPreviewOpen && (
          <TouchableOpacity
            style={styles.photoPreviewWrapper}
            onPress={() => setIsPreviewOpen(true)}
          >
            <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
          </TouchableOpacity>
        )}


        
        {photoUri && isPreviewOpen && (
          <View style={styles.fullPreviewContainer}>
            <Image
              source={{ uri: photoUri }}
              style={styles.fullPreviewImage}
            />
            <View style={styles.fullPreviewButtons}>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => {
                  setIsPreviewOpen(false); // close full-screen preview
                }}
              >
                <Text style={styles.text}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => {
                  // Placeholder for save
                }}
              >
                <Text style={styles.text}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isPreviewOpen && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={takePicture}>
              <Text style={styles.text}>Take</Text>
            </TouchableOpacity>
          </View>
        )}
      

      <View style={styles.buttonContainer}>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
      paddingTop: 50,
      paddingBottom: 6,
      flexDirection: "row",
      alignItems: "center",
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 64,
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  photoPreviewWrapper: {
  position: 'absolute',
  top: 40,
  right: 20,
  width: 100,
  height: 140,
  zIndex: 10,
},

photoPreviewImage: {
  width: '100%',
  height: '100%',
  borderRadius: 10,
  borderWidth: 2,
  borderColor: 'white',
},
  fullPreviewContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'black',
  justifyContent: 'center',
},

fullPreviewImage: {
  flex: 1,
  resizeMode: 'contain',
},

fullPreviewButtons: {
  position: 'absolute',
  top: 100,
  left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
},

previewButton: {
  backgroundColor: 'rgba(0,0,0,0.6)',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 8,
},

previewText: {
  color: 'white',
  fontSize: 16,
},

});