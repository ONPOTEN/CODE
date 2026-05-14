import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/friend_service.dart';
import '../services/message_service.dart';
import 'friend_requests_screen.dart';
import 'add_friend_screen.dart';
import 'chat_screen.dart';

class FriendsListScreen extends StatefulWidget {
  const FriendsListScreen({Key? key}) : super(key: key);

  @override
  State<FriendsListScreen> createState() => _FriendsListScreenState();
}

class _FriendsListScreenState extends State<FriendsListScreen> with SingleTickerProviderStateMixin {
  List<User> _friends = [];
  List<User> _filteredFriends = [];
  int _pendingRequestsCount = 0;
  bool _isLoading = true;
  String _searchQuery = '';
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadFriends();
    _loadPendingRequestsCount();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFriends() async {
    setState(() => _isLoading = true);

    final result = await FriendService.getFriends();

    if (mounted && result['success'] == true) {
      setState(() {
        _friends = result['friends'];
        _filteredFriends = _friends;
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadPendingRequestsCount() async {
    final result = await FriendService.getFriendRequests();

    if (mounted && result['success'] == true) {
      setState(() {
        _pendingRequestsCount = (result['requests'] as List).length;
      });
    }
  }

  void _filterFriends(String query) {
    setState(() {
      _searchQuery = query;
      if (query.isEmpty) {
        _filteredFriends = _friends;
      } else {
        _filteredFriends = _friends.where((friend) {
          final name = friend.displayName.toLowerCase();
          final username = friend.username.toLowerCase();
          final searchLower = query.toLowerCase();
          return name.contains(searchLower) || username.contains(searchLower);
        }).toList();
      }
    });
  }

  Future<void> _openChat(User friend) async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // Get or create conversation with this friend
      final result = await MessageService.getOrCreateConversation(friend.id);

      if (mounted) {
        // Close loading indicator
        Navigator.of(context).pop();

        if (result['success'] == true) {
          // Navigate to chat screen
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ChatScreen(
                conversation: result['conversation'],
              ),
            ),
          );
        } else {
          // Show error message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to open chat'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        // Close loading indicator
        Navigator.of(context).pop();

        // Show error message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _unfriend(User friend) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unfriend'),
        content: Text('Are you sure you want to remove ${friend.displayName} from your friends?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Unfriend'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final result = await FriendService.unfriend(friend.id);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Failed to unfriend'),
          backgroundColor: result['success'] == true ? Colors.green : Colors.red,
        ),
      );

      if (result['success'] == true) {
        _loadFriends();
      }
    }
  }

  Widget _buildFriendCard(User friend) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.blue,
          child: Text(
            friend.displayName.isNotEmpty ? friend.displayName[0].toUpperCase() : 'U',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          friend.displayName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text('@${friend.username}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.message, color: Colors.blue),
              onPressed: () => _openChat(friend),
              tooltip: 'Send Message',
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'unfriend') {
                  _unfriend(friend);
                } else if (value == 'message') {
                  _openChat(friend);
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'message',
                  child: Row(
                    children: [
                      Icon(Icons.message, size: 20, color: Colors.blue),
                      SizedBox(width: 12),
                      Text('Send Message'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'unfriend',
                  child: Row(
                    children: [
                      Icon(Icons.person_remove, size: 20, color: Colors.orange),
                      SizedBox(width: 12),
                      Text('Unfriend', style: TextStyle(color: Colors.orange)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFriendsList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_filteredFriends.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 80, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isEmpty ? 'No friends yet' : 'No friends found',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            if (_searchQuery.isEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Add friends to start connecting',
                style: TextStyle(color: Colors.grey[500]),
              ),
            ],
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadFriends,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _filteredFriends.length,
        itemBuilder: (context, index) {
          return _buildFriendCard(_filteredFriends[index]);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Friends'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.person_add),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const FriendRequestsScreen(),
                    ),
                  ).then((_) {
                    _loadPendingRequestsCount();
                    _loadFriends();
                  });
                },
                tooltip: 'Friend Requests',
              ),
              if (_pendingRequestsCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      _pendingRequestsCount > 9 ? '9+' : _pendingRequestsCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AddFriendScreen(),
                ),
              ).then((_) {
                _loadFriends();
                _loadPendingRequestsCount();
              });
            },
            tooltip: 'Add Friend',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              onChanged: _filterFriends,
              decoration: InputDecoration(
                hintText: 'Search friends...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20),
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.blue[50],
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatCard('Friends', _friends.length.toString(), Icons.people),
                _buildStatCard('Requests', _pendingRequestsCount.toString(), Icons.mail),
              ],
            ),
          ),
          Expanded(child: _buildFriendsList()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const AddFriendScreen(),
            ),
          ).then((_) {
            _loadFriends();
            _loadPendingRequestsCount();
          });
        },
        backgroundColor: Colors.blue,
        icon: const Icon(Icons.person_add),
        label: const Text('Add Friend'),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(icon, color: Colors.blue, size: 32),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue,
                ),
              ),
              Text(
                label,
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
