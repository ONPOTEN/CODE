import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/group.dart';
import '../services/group_service.dart';
import '../services/api_config.dart';
import 'group_detail_screen.dart';
import '../widgets/notification_bell.dart';

class GroupsListScreen extends StatefulWidget {
  const GroupsListScreen({Key? key}) : super(key: key);

  @override
  State<GroupsListScreen> createState() => _GroupsListScreenState();
}

class _GroupsListScreenState extends State<GroupsListScreen> {
  List<Group> _groups = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMoreGroups = true;

  String _searchTerm = '';
  String _filterVisibility = 'all';
  String _filterStatus = 'active';

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadGroups();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMoreGroups) {
        _loadMoreGroups();
      }
    }
  }

  Future<void> _loadGroups({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _groups = [];
        _hasMoreGroups = true;
        _isLoading = true;
        _errorMessage = null;
      });
    } else {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final result = await GroupService.getGroups(
        page: _currentPage,
        perPage: 12,
        search: _searchTerm.isEmpty ? null : _searchTerm,
        visibility: _filterVisibility,
        status: _filterStatus,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true) {
            final newGroups = result['groups'] as List<Group>;
            if (refresh) {
              _groups = newGroups;
            } else {
              _groups.addAll(newGroups);
            }
            _hasMoreGroups = newGroups.length >= 12;
          } else {
            _errorMessage = result['message'] ?? 'Không thể tải danh sách nhóm';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Lỗi: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _loadMoreGroups() async {
    if (_isLoadingMore || !_hasMoreGroups) return;

    setState(() {
      _isLoadingMore = true;
    });

    _currentPage++;

    try {
      final result = await GroupService.getGroups(
        page: _currentPage,
        perPage: 12,
        search: _searchTerm.isEmpty ? null : _searchTerm,
        visibility: _filterVisibility,
        status: _filterStatus,
      );

      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          if (result['success'] == true) {
            final newGroups = result['groups'] as List<Group>;
            _groups.addAll(newGroups);
            _hasMoreGroups = newGroups.length >= 12;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          _currentPage--;
        });
      }
    }
  }

  void _onSearchSubmit() {
    _searchTerm = _searchController.text.trim();
    _loadGroups(refresh: true);
  }

  void _onVisibilityChanged(String? value) {
    if (value != null) {
      setState(() {
        _filterVisibility = value;
      });
      _loadGroups(refresh: true);
    }
  }

  void _onStatusChanged(String? value) {
    if (value != null) {
      setState(() {
        _filterStatus = value;
      });
      _loadGroups(refresh: true);
    }
  }

  Widget _buildGroupCard(Group group) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => GroupDetailScreen(groupId: group.groupId),
          ),
        );
      },
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Cover Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: Container(
                height: 100,
                color: Colors.blue[100],
                child: group.coverImage != null && group.coverImage!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: ApiConfig.getImageUrl(group.coverImage!),
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: 100,
                        placeholder: (context, url) => Container(
                          color: Colors.blue[100],
                          child: const Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: Colors.blue[100],
                          child: Icon(Icons.group, size: 40, color: Colors.blue[300]),
                        ),
                      )
                    : Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.blue[300]!, Colors.blue[600]!],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Icon(Icons.group, size: 40, color: Colors.white.withOpacity(0.5)),
                      ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar and Name Row
                  Row(
                    children: [
                      // Group Avatar
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.blue[200],
                        backgroundImage: group.avatar != null && group.avatar!.isNotEmpty
                            ? CachedNetworkImageProvider(ApiConfig.getImageUrl(group.avatar!))
                            : null,
                        child: group.avatar == null || group.avatar!.isEmpty
                            ? Text(
                                group.groupName.isNotEmpty
                                    ? group.groupName[0].toUpperCase()
                                    : 'G',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 10),
                      // Group Name
                      Expanded(
                        child: Text(
                          group.groupName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Description
                  if (group.description != null && group.description!.isNotEmpty)
                    Text(
                      group.description!,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 10),
                  // Stats Row
                  Row(
                    children: [
                      // Members
                      Icon(Icons.people, size: 16, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        '${group.membersCount}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Posts
                      Icon(Icons.article, size: 16, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        '${group.postsCount}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                      const Spacer(),
                      // Visibility Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: group.isPublic() ? Colors.green[100] : Colors.orange[100],
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          group.isPublic() ? 'Công khai' : 'Riêng tư',
                          style: TextStyle(
                            fontSize: 10,
                            color: group.isPublic() ? Colors.green[800] : Colors.orange[800],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Nhóm'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Colors.grey[200], height: 1),
        ),
        actions: [
          const NotificationBell(),
        ],
      ),
      body: Column(
        children: [
          // Search and Filters
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Search Bar
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Tìm kiếm nhóm...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        if (_searchTerm.isNotEmpty) {
                          _searchTerm = '';
                          _loadGroups(refresh: true);
                        }
                      },
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _onSearchSubmit(),
                ),
                const SizedBox(height: 12),
                // Filters Row
                Row(
                  children: [
                    // Visibility Filter
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _filterVisibility,
                        decoration: InputDecoration(
                          labelText: 'Hiển thị',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Tất cả')),
                          DropdownMenuItem(value: 'public', child: Text('Công khai')),
                          DropdownMenuItem(value: 'private', child: Text('Riêng tư')),
                        ],
                        onChanged: _onVisibilityChanged,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Status Filter
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _filterStatus,
                        decoration: InputDecoration(
                          labelText: 'Trạng thái',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Tất cả')),
                          DropdownMenuItem(value: 'active', child: Text('Hoạt động')),
                          DropdownMenuItem(value: 'inactive', child: Text('Không hoạt động')),
                        ],
                        onChanged: _onStatusChanged,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Groups Grid
          Expanded(
            child: _isLoading && _groups.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null && _groups.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                            const SizedBox(height: 16),
                            Text(
                              'Lỗi',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _loadGroups(refresh: true),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Thử lại'),
                            ),
                          ],
                        ),
                      )
                    : _groups.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.group_off, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                const Text(
                                  'Không tìm thấy nhóm nào',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadGroups(refresh: true),
                            child: GridView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(16),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 0.75,
                              ),
                              itemCount: _groups.length + (_isLoadingMore ? 2 : 0),
                              itemBuilder: (context, index) {
                                if (index >= _groups.length) {
                                  return const Center(
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  );
                                }
                                return _buildGroupCard(_groups[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
