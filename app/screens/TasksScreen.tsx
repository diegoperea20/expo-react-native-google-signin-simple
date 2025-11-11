import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { TaskAnalyticsScreen } from './TaskAnalyticsScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';

type Task = {
  id: number;
  useremail: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
};

type TasksScreenProps = {
  userEmail: string;
  onBack: () => void;
};

export const TasksScreen = ({ userEmail, onBack }: TasksScreenProps) => {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchTasks = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .eq('useremail', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTasks(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch tasks');
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    // Initial fetch
    fetchTasks();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'task',
          filter: `useremail=eq.${userEmail}`
        }, 
        (payload) => {
          console.log('Realtime event received:', payload);
          
          // Use functional updates to ensure we're working with the latest state
          setTasks(currentTasks => {
            switch (payload.eventType) {
              case 'INSERT':
                // Add new task at the beginning of the list
                return [{
                  ...payload.new as Task,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, ...currentTasks];
                
              case 'UPDATE':
                // Update existing task
                return currentTasks.map(task => 
                  task.id === (payload.new as Task).id 
                    ? { 
                        ...payload.new as Task, 
                        updated_at: new Date().toISOString() 
                      }
                    : task
                );
                
              case 'DELETE':
                // Remove deleted task
                return currentTasks.filter(
                  task => task.id !== (payload.old as { id: number }).id
                );
                
              default:
                return currentTasks;
            }
          });
        }
      )
      .subscribe(
        (status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to tasks changes');
          }
        },
        (error) => {
          console.error('Subscription error:', error);
        }
      );

    // Cleanup function
    return () => {
      console.log('Unsubscribing from tasks channel');
      supabase.removeChannel(channel);
    };
  }, [userEmail]); // Removed fetchTasks from dependencies to prevent unnecessary re-subscriptions


  const handleAddTask = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('task')
        .insert([
          { 
            useremail: userEmail,
            title: title.trim(),
            description: description.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      
      // Clear form fields
      setTitle('');
      setDescription('');
      
      // Optional: Force a refresh if needed (though real-time should handle it)
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = (taskId: number) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const { error } = await supabase
                .from('task')
                .delete()
                .eq('id', taskId);

              if (error) throw error;
              
              // Optional: Force a refresh if needed (though real-time should handle it)
              await fetchTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTitle.trim() || !editDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('task')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id);

      if (error) throw error;
      
      // Reset form and editing state
      setEditingTask(null);
      setEditTitle('');
      setEditDescription('');
      
      // Optional: Force a refresh if needed (though real-time should handle it)
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View className="bg-white p-4 rounded-lg mb-2 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800">{item.title}</Text>
          <Text className="text-gray-600 mt-1">{item.description}</Text>
          <Text className="text-xs text-gray-400 mt-2">
            {new Date(item.created_at).toLocaleString()}
            {item.updated_at && item.updated_at !== item.created_at && 
              ` • Updated: ${new Date(item.updated_at).toLocaleString()}`}
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => handleEditTask(item)}
            className="p-2"
          >
            <MaterialCommunityIcons name="pencil-outline" size={22} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDeleteTask(item.id)}
            className="p-2"
          >
            <MaterialCommunityIcons name="delete-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={!!editingTask}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEditingTask(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text className="text-lg font-bold mb-4">Edit Task</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-3"
            placeholder="Task title"
            value={editTitle}
            onChangeText={setEditTitle}
          />
          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4 h-24"
            placeholder="Task description"
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
          />
          <View className="flex-row justify-end space-x-2">
            <TouchableOpacity
              className="px-4 py-2 rounded-lg"
              onPress={() => setEditingTask(null)}
            >
              <Text className="text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-2 rounded-lg"
              onPress={handleUpdateTask}
            >
              <Text className="text-white font-semibold">Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 20,
      width: '90%',
      maxWidth: 400,
    },
  });

  if (showAnalytics) {
    return (
      <TaskAnalyticsScreen 
        userEmail={userEmail} 
        onBack={() => setShowAnalytics(false)} 
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-100 p-4">
      {renderEditModal()}
      <View className="flex-row items-center mb-4">
        <TouchableOpacity 
          onPress={onBack}
          className="p-2 mr-2"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-800">My Tasks</Text>
        <TouchableOpacity
          className="ml-auto bg-purple-500 px-4 py-2 rounded-lg"
          onPress={() => setShowAnalytics(true)}
        >
          <Text className="text-white font-semibold">Same Task</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <Text className="text-lg font-semibold mb-3">Add New Task</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-3"
          placeholder="Task title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-3 h-20"
          placeholder="Task description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TouchableOpacity
          className="bg-blue-500 py-3 rounded-lg items-center"
          onPress={handleAddTask}
        >
          <Text className="text-white font-semibold">Add Task</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : tasks.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-400 mt-2">No tasks yet</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
