import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';

type TaskAnalyticsScreenProps = {
  userEmail: string;
  onBack: () => void;
};

type TitleCount = {
  title: string;
  count: number;
};

type EmailTitle = {
  useremail: string;
  title: string;
};

export const TaskAnalyticsScreen = ({ userEmail, onBack }: TaskAnalyticsScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [titleCounts, setTitleCounts] = useState<TitleCount[]>([]);
  const [emailTitles, setEmailTitles] = useState<EmailTitle[]>([]);
  const [activeTab, setActiveTab] = useState<'count' | 'emails' | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>('');

  const fetchTitleCounts = async () => {
    setLoading(true);
    setActiveTab('count');
    try {
      // First get the current user's tasks
      const { data: userTasks, error: userError } = await supabase
        .from('task')
        .select('title')
        .eq('useremail', userEmail);

      if (userError) throw userError;
      if (!userTasks || userTasks.length === 0) {
        Alert.alert('Info', 'No tasks found for the current user');
        return;
      }

      // Get counts for each of the user's titles
      const counts = await Promise.all(
        userTasks.map(async (task) => {
          const { count, error } = await supabase
            .from('task')
            .select('*', { count: 'exact', head: true })
            .eq('title', task.title);

          if (error) throw error;
          return { title: task.title, count: count || 0 };
        })
      );

      // Remove duplicates and sort by count descending
      const uniqueCounts = Array.from(
        new Map(counts.map(item => [item.title, item])).values()
      ).sort((a, b) => b.count - a.count);

      setTitleCounts(uniqueCounts);
    } catch (error) {
      console.error('Error fetching title counts:', error);
      Alert.alert('Error', 'Failed to fetch task analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTitles = async () => {
    // If we already have title counts, use them
    if (titleCounts.length > 0) {
      return titleCounts.map(item => item.title);
    }
    
    // Otherwise fetch the titles
    const { data: userTitlesData, error: titlesError } = await supabase
      .from('task')
      .select('title')
      .eq('useremail', userEmail);

    if (titlesError) throw titlesError;
    
    if (!userTitlesData || userTitlesData.length === 0) {
      return [];
    }
    
    // Return unique titles
    return [...new Set(userTitlesData.map(item => item.title))];
  };

  const fetchEmailsForTitle = async () => {
    setLoading(true);
    setActiveTab('emails');
    
    try {
      // Get user's titles (will fetch if not already loaded)
      const titles = await fetchUserTitles();
      
      if (titles.length === 0) {
        Alert.alert('Info', 'No tasks found for the current user');
        setEmailTitles([]);
        return;
      }
      
      // Find all tasks that have the same titles as the current user's tasks
      // but exclude the current user's own tasks
      const { data: matchingTasks, error: tasksError } = await supabase
        .from('task')
        .select('useremail, title')
        .in('title', titles)
        .neq('useremail', userEmail);

      if (tasksError) throw tasksError;

      // Process the data to get unique user-email combinations
      const uniqueEmails = Array.from(
        new Map(
          matchingTasks.map(item => [
            `${item.useremail}-${item.title}`,  // Use email-title as unique key
            { useremail: item.useremail, title: item.title }
          ])
        ).values()
      ).sort((a, b) => 
        a.useremail.localeCompare(b.useremail) || 
        a.title.localeCompare(b.title)
      );

      setEmailTitles(uniqueEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      Alert.alert('Error', 'Failed to fetch email data');
    } finally {
      setLoading(false);
    }
  };

  const renderTableHeader = (columns: string[]) => (
    <View style={styles.tableHeader}>
      {columns.map((column, index) => (
        <Text key={index} style={styles.headerText}>
          {column}
        </Text>
      ))}
    </View>
  );

  const renderTableRow = (items: string[], index: number) => (
    <View 
      key={index} 
      style={[
        styles.tableRow,
        { backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }
      ]}
    >
      {items.map((item, i) => (
        <Text key={i} style={styles.cellText}>
          {item}
        </Text>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity 
          onPress={onBack}
          className="p-2 mr-2"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-800">Task Analytics</Text>
      </View>

      <View className="flex-row space-x-4 mb-6">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'count' ? 'bg-blue-500' : 'bg-blue-400'}`}
          onPress={fetchTitleCounts}
          disabled={loading}
        >
          <Text className="text-white font-semibold">Count People Same Title</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'emails' ? 'bg-green-500' : 'bg-green-400'}`}
          onPress={fetchEmailsForTitle}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-center">People With Same Titles</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView className="bg-white rounded-lg shadow-sm">
          {activeTab === 'count' && titleCounts.length > 0 && (
            <View>
              {renderTableHeader(['NUMBER OF TITLES', 'TITLE'])}
              {titleCounts.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={fetchEmailsForTitle}
                >
                  {renderTableRow([item.count.toString(), item.title], index)}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === 'emails' && emailTitles.length > 0 && (
            <View>
              
              {renderTableHeader(['EMAIL', 'TITLE'])}
              {emailTitles.map((item, index) => (
                <View key={index}>
                  {renderTableRow([item.useremail, item.title], index)}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cellText: {
    flex: 1,
    textAlign: 'center',
    color: '#444',
  },
});
