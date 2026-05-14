import 'dart:math';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/group.dart';
import '../services/group_service.dart';
import '../services/api_config.dart';
import '../screens/group_detail_screen.dart';

class SuggestedGroups extends StatefulWidget {
  final int? currentGroupId;

  const SuggestedGroups({Key? key, this.currentGroupId}) : super(key: key);

  @override
  _SuggestedGroupsState createState() => _SuggestedGroupsState();
}

class _SuggestedGroupsState extends State<SuggestedGroups> {
  List<Group> _suggestions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSuggestions();
  }

  Future<void> _fetchSuggestions() async {
    try {
      if (mounted) {
        setState(() {
          _isLoading = true;
        });
      }

      final result = await GroupService.getGroups(perPage: 10);

      if (mounted) {
        if (result['success'] == true) {
          List<Group> groupsList = result['groups'] as List<Group>;
          
          // Filter out the current group
          if (widget.currentGroupId != null) {
            groupsList = groupsList.where((g) => g.groupId != widget.currentGroupId).toList();
          }
          
          // Shuffle and pick up to 5 groups
          groupsList.shuffle(Random());
          if (groupsList.length > 5) {
            groupsList = groupsList.sublist(0, 5);
          }
          
          setState(() {
            _suggestions = groupsList;
            _isLoading = false;
          });
        } else {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _suggestions.isEmpty) {
      return const SizedBox.shrink();
    }

    if (_suggestions.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.symmetric(
          horizontal: BorderSide(color: Colors.grey[200]!, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Gợi ý nhóm',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.grey[900],
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    // Navigate to all groups if route exists
                    // Navigator.pushNamed(context, '/groups');
                  },
                  child: Text(
                    'Xem tất cả',
                    style: TextStyle(
                      color: Colors.blue[600],
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 200, // Fixed height for horizontal list
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 16, right: 8, bottom: 8),
              itemCount: _suggestions.length,
              itemBuilder: (context, index) {
                final group = _suggestions[index];
                final avatarUrl = group.avatar != null && group.avatar!.isNotEmpty
                    ? ApiConfig.getImageUrl(group.avatar!)
                    : null;

                return GestureDetector(
                  onTap: () {
                    // Navigate to GroupDetailScreen and replace current route if needed or push new
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => GroupDetailScreen(groupId: group.groupId),
                      ),
                    );
                  },
                  child: Container(
                    width: 160,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.grey[200]!),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 16, bottom: 12),
                          child: avatarUrl != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: CachedNetworkImage(
                                    imageUrl: avatarUrl,
                                    width: 64,
                                    height: 64,
                                    fit: BoxFit.cover,
                                    placeholder: (context, url) => Container(
                                      width: 64,
                                      height: 64,
                                      color: Colors.grey[200],
                                      child: const Center(
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                    ),
                                    errorWidget: (context, url, error) => _buildDefaultAvatar(group),
                                  ),
                                )
                              : _buildDefaultAvatar(group),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            group.groupName,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: Colors.grey[900],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            '${group.membersCount} thành viên',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[500],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const Spacer(),
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => GroupDetailScreen(groupId: group.groupId),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue[50],
                                foregroundColor: Colors.blue[600],
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                minimumSize: const Size.fromHeight(32),
                              ),
                              child: const Text('Tham gia', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultAvatar(Group group) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue[400]!, Colors.blue[600]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          group.groupName.isNotEmpty ? group.groupName[0].toUpperCase() : 'G',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
      ),
    );
  }
}
