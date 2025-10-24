    // src/firebaseConfig.js
    import { initializeApp } from "firebase/app";
    import { getFirestore, setLogLevel } from "firebase/firestore"; // Import getFirestore and setLogLevel

    // Your web app's Firebase configuration
    const firebaseConfig = {
    apiKey: "AIzaSyCsRDmjniPZmjvfkGzUhXellfZ-Fewz-NU",
    authDomain: "hedera-nft-marketplace-73b5d.firebaseapp.com",
    projectId: "hedera-nft-marketplace-73b5d",
    storageBucket: "hedera-nft-marketplace-73b5d.firebasestorage.app",
    messagingSenderId: "742699138595",
    appId: "1:742699138595:web:d9b85ef9196a171d187b96"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    // Initialize Firestore
    const db = getFirestore(app);

    // Enable Firestore debug logging (optional, but helpful for development)
    setLogLevel('debug');

    // Export the firestore database instance
    export { db };
