import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, Alert, Keyboard
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { llmService } from './src/services/llm';
import { agentService } from './src/services/agent';
// Cần cài đặt @expo/vector-icons
import { Ionicons, Feather } from '@expo/vector-icons';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  attachment?: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Xin chào! Tôi là AI chạy hoàn toàn offline trên điện thoại của bạn. Bạn muốn tôi giúp gì?', isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string, name: string } | null>(null);
  
  // Trạng thái model
  const [modelStatus, setModelStatus] = useState<'idle' | 'downloading' | 'ready'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Khởi tạo app: Kiểm tra xem có sẵn file chưa
    initModel();
  }, []);

  const initModel = async () => {
    try {
      setModelStatus('downloading');
      await llmService.downloadModel((progress) => {
        setDownloadProgress(Math.round(progress * 100));
      });
      await llmService.loadModel();
      setModelStatus('ready');
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể khởi tạo mô hình AI.');
      setModelStatus('idle');
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf'],
        copyToCacheDirectory: true
      });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        setSelectedFile({
          uri: result.assets[0].uri,
          name: result.assets[0].name
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      attachment: selectedFile?.name
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    const currentFileUri = selectedFile?.uri;
    
    setInputText('');
    setSelectedFile(null);
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      // Gọi Agent Service thay vì gọi LLM thuần
      const replyText = await agentService.processQuery(currentInput, currentFileUri);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Xin lỗi, đã có lỗi xảy ra trong quá trình sinh văn bản.",
        isUser: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.botBubble]}>
      {item.attachment && (
        <View style={styles.attachmentView}>
          <Feather name="file-text" size={16} color="#ddd" />
          <Text style={styles.attachmentText}>{item.attachment}</Text>
        </View>
      )}
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local AI Agent</Text>
        {modelStatus === 'downloading' && (
          <Text style={styles.headerSub}>Đang tải Model: {downloadProgress}%</Text>
        )}
        {modelStatus === 'ready' && (
          <Text style={styles.headerSubReady}>● Sẵn sàng (Offline)</Text>
        )}
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.typingText}>AI đang suy nghĩ...</Text>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {selectedFile && (
          <View style={styles.selectedFilePreview}>
            <Feather name="file" size={16} color="#4A90E2" />
            <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handlePickFile}>
            <Feather name="paperclip" size={24} color="#888" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Hỏi bất cứ điều gì..."
            placeholderTextColor="#888"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() && !selectedFile) && {opacity: 0.5}]} 
            onPress={sendMessage}
            disabled={!inputText.trim() && !selectedFile || modelStatus !== 'ready'}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E', // Dark mode background
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#E2A94A',
    fontSize: 12,
    marginTop: 4,
  },
  headerSubReady: {
    color: '#4AE290',
    fontSize: 12,
    marginTop: 4,
  },
  chatList: {
    padding: 16,
    paddingBottom: 40,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#303030',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
  },
  messageText: {
    color: '#E0E0E0',
    fontSize: 16,
    lineHeight: 24,
  },
  attachmentView: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentText: {
    color: '#ddd',
    marginLeft: 8,
    fontSize: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typingText: {
    color: '#888',
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    color: '#FFF',
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
  },
  attachButton: {
    padding: 10,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    justifyContent: 'space-between'
  },
  selectedFileName: {
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
  }
});
