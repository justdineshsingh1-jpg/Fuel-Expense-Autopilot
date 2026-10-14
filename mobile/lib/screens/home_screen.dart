import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/permission_utils.dart';
import '../utils/camera_utils.dart';
import '../widgets/status_badge.dart';
import '../widgets/photo_thumbnail.dart';
import 'package:intl/intl.dart';
import 'dart:io';
import 'trip_history_screen.dart';
import 'trip_detail_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _odometerController = TextEditingController();
  final TextEditingController _expenseAmountController = TextEditingController();
  final TextEditingController _expenseRemarksController = TextEditingController();
  String _selectedExpenseType = 'Fuel / Petrol';
  int _currentNavIndex = 0;

  final List<String> _expenseTypes = [
    'Fuel / Petrol',
    'Bike Servicing',
    'Spare Parts',
    'Toll / Parking',
    'Other (Specify below)'
  ];

  @override
  void initState() {
    super.initState();
    PermissionUtils.requestAllPermissions();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkRecoveredCameraData();
      Provider.of<TripProvider>(context, listen: false).loadTrips();
    });
  }

  Future<void> _checkRecoveredCameraData() async {
    final lostPath = await CameraUtils.retrieveLostData();
    if (lostPath != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Recovered previous camera capture.'),
          backgroundColor: Colors.blue,
        ),
      );
    }
  }

  void _showStartShiftModal(BuildContext context) {
    String? capturedImageUrl;
    bool isStarting = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext modalCtx, StateSetter modalSetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Start Shift', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Start Odometer Reading (KM) *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _odometerController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        hintText: 'e.g. 45201',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Live Dashboard Photo *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: isStarting ? null : () async {
                        final url = await CameraUtils.showPhotoSourceDialog(context, title: 'Dashboard Photo');
                        if (url != null) {
                          modalSetState(() { capturedImageUrl = url; });
                        }
                      },
                      child: Container(
                        height: 140,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: capturedImageUrl != null 
                          ? (capturedImageUrl!.startsWith('http') 
                              ? Image.network(capturedImageUrl!, fit: BoxFit.cover) 
                              : Image.file(File(capturedImageUrl!), cacheWidth: 600, fit: BoxFit.cover))
                          : const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.camera_alt_outlined, size: 36, color: Colors.grey),
                                SizedBox(height: 6),
                                Text('Tap to capture or select photo', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                                Text('Camera or Gallery supported', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D5BB5),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isStarting ? null : () async {
                          final reading = _odometerController.text.trim();
                          final parsed = double.tryParse(reading);
                          if (parsed == null || parsed < 0) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid numeric starting odometer reading.')));
                            return;
                          }
                          if (capturedImageUrl == null) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please capture or select a dashboard photo.')));
                            return;
                          }

                          modalSetState(() { isStarting = true; });
                          final img = capturedImageUrl!;
                          final messenger = ScaffoldMessenger.of(context);
                          final tripProv = Provider.of<TripProvider>(context, listen: false);

                          try {
                            _odometerController.clear();
                            if (ctx.mounted) {
                              Navigator.pop(ctx);
                            }
                            messenger.showSnackBar(const SnackBar(content: Text('Starting shift...')));
                            final ok = await tripProv.startTrip(reading, img);
                            messenger.showSnackBar(SnackBar(
                              content: Text(ok ? 'Shift started successfully!' : 'Shift active in offline mode.'),
                              backgroundColor: ok ? Colors.green : Colors.orange,
                            ));
                          } catch (err) {
                            modalSetState(() { isStarting = false; });
                            messenger.showSnackBar(SnackBar(
                              content: Text('Error starting shift: $err'),
                              backgroundColor: Colors.red,
                            ));
                          }
                        },
                        child: isStarting
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Confirm & Start Shift', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          }
        );
      },
    );
  }

  void _showEndShiftModal(BuildContext context) {
    final TextEditingController endOdoController = TextEditingController();
    String? capturedImageUrl;
    bool isEnding = false;
    final tripProv = Provider.of<TripProvider>(context, listen: false);
    final double startReadingVal = double.tryParse(tripProv.startReading) ?? 0.0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext modalCtx, StateSetter modalSetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('End Shift', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Shift started at: ${startReadingVal.toStringAsFixed(0)} KM',
                        style: TextStyle(color: Colors.blue.shade900, fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('End Odometer Reading (KM) *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: endOdoController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        hintText: 'Must be >= ${startReadingVal.toStringAsFixed(0)} KM',
                        border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Live Dashboard Photo *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: isEnding ? null : () async {
                        final url = await CameraUtils.showPhotoSourceDialog(context, title: 'End Dashboard Photo');
                        if (url != null) {
                          modalSetState(() { capturedImageUrl = url; });
                        }
                      },
                      child: Container(
                        height: 140,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: capturedImageUrl != null 
                          ? (capturedImageUrl!.startsWith('http') 
                              ? Image.network(capturedImageUrl!, fit: BoxFit.cover) 
                              : Image.file(File(capturedImageUrl!), cacheWidth: 600, fit: BoxFit.cover))
                          : const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.camera_alt_outlined, size: 36, color: Colors.grey),
                                SizedBox(height: 6),
                                Text('Tap to capture or select photo', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                                Text('Camera or Gallery supported', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isEnding ? null : () async {
                          final readingStr = endOdoController.text.trim();
                          final endVal = double.tryParse(readingStr);
                          if (endVal == null || endVal <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid ending odometer reading.')));
                            return;
                          }
                          if (capturedImageUrl == null) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please capture end dashboard photo.')));
                            return;
                          }

                          if (endVal < startReadingVal) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text('End reading ($endVal KM) cannot be less than start reading ($startReadingVal KM)!'),
                              backgroundColor: Colors.red,
                            ));
                            return;
                          }

                          modalSetState(() { isEnding = true; });
                          final img = capturedImageUrl!;
                          final messenger = ScaffoldMessenger.of(context);
                          final tripProv = Provider.of<TripProvider>(context, listen: false);

                          try {
                            if (ctx.mounted) {
                              Navigator.pop(ctx);
                            }
                            messenger.showSnackBar(const SnackBar(content: Text('Ending shift and saving all data...')));
                            final ok = await tripProv.endTrip(
                              readingStr,
                              img,
                              0.0,
                              0.0,
                              'Ended via app',
                            );
                            messenger.showSnackBar(SnackBar(
                              content: Text(ok ? 'Shift ended successfully! All data recorded.' : 'Shift saved locally.'),
                              backgroundColor: ok ? Colors.green : Colors.orange,
                            ));
                          } catch (err) {
                            modalSetState(() { isEnding = false; });
                            messenger.showSnackBar(SnackBar(
                              content: Text('Error ending shift: $err'),
                              backgroundColor: Colors.red,
                            ));
                          }
                        },
                        child: isEnding
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Confirm & End Trip', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          }
        );
      },
    );
  }

  void _showAddExpenseModal(BuildContext context) {
    String? capturedImageUrl;
    bool isSubmitting = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext modalCtx, StateSetter modalSetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Add Expense Bill', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Expense Type *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[400]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedExpenseType,
                          isExpanded: true,
                          items: _expenseTypes.map((String type) {
                            return DropdownMenuItem<String>(
                              value: type,
                              child: Text(type),
                            );
                          }).toList(),
                          onChanged: (String? newValue) {
                            modalSetState(() {
                              if (newValue != null) _selectedExpenseType = newValue;
                            });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Amount (₹) *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _expenseAmountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        hintText: 'e.g. 450',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Remarks / Details', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _expenseRemarksController,
                      decoration: const InputDecoration(
                        hintText: 'e.g. Changed engine oil or fuel slip',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Live Bill Photo *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: isSubmitting ? null : () async {
                        final url = await CameraUtils.showPhotoSourceDialog(context, title: 'Attach Bill Photo');
                        if (url != null) {
                          modalSetState(() { capturedImageUrl = url; });
                        }
                      },
                      child: Container(
                        height: 130,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: capturedImageUrl != null
                          ? (capturedImageUrl!.startsWith('http') 
                              ? Image.network(capturedImageUrl!, fit: BoxFit.cover) 
                              : Image.file(File(capturedImageUrl!), cacheWidth: 600, fit: BoxFit.cover))
                          : const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.camera_alt_outlined, size: 32, color: Colors.grey),
                                SizedBox(height: 6),
                                Text('Tap to capture or choose photo', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                                Text('Camera or Gallery supported', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D5BB5),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isSubmitting ? null : () async {
                          final amtStr = _expenseAmountController.text.trim();
                          final amt = double.tryParse(amtStr);
                          if (amt == null || amt <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid expense amount.')));
                            return;
                          }
                          if (capturedImageUrl == null) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please attach a photo of the bill.')));
                            return;
                          }

                          modalSetState(() { isSubmitting = true; });
                          final remarks = _expenseRemarksController.text.trim();
                          final imgUrl = capturedImageUrl!;
                          final messenger = ScaffoldMessenger.of(context);
                          final tripProv = Provider.of<TripProvider>(context, listen: false);

                          try {
                            final ok = await tripProv.addExpense(
                              _selectedExpenseType,
                              amt,
                              remarks,
                              imgUrl,
                            );

                            _expenseAmountController.clear();
                            _expenseRemarksController.clear();
                            if (ctx.mounted) {
                              Navigator.pop(ctx);
                            }
                            messenger.showSnackBar(SnackBar(
                              content: Text(ok ? 'Expense bill added and saved!' : 'Expense saved locally.'),
                              backgroundColor: ok ? Colors.green : Colors.orange,
                            ));
                          } catch (err) {
                            modalSetState(() { isSubmitting = false; });
                            messenger.showSnackBar(SnackBar(
                              content: Text('Error saving expense: $err'),
                              backgroundColor: Colors.red,
                            ));
                          }
                        },
                        child: isSubmitting 
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Confirm & Submit', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          }
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final tripProvider = Provider.of<TripProvider>(context);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF0F172A)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const CircleAvatar(
                    backgroundColor: Colors.blue,
                    radius: 30,
                    child: Icon(Icons.person, size: 35, color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  Text(user?.fullName ?? 'Agent', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(user?.email ?? '', style: const TextStyle(color: Colors.white70, fontSize: 14)),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.home),
              title: const Text('Home'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.history),
              title: const Text('My History'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const TripHistoryScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Profile & Settings'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: () {
                Provider.of<AuthProvider>(context, listen: false).logout();
              },
            ),
          ],
        ),
      ),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.black),
        title: const Text('Fuel Expense Autopilot', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: Color(0xFF1D5BB5)),
            tooltip: 'View History',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const TripHistoryScreen()));
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.black),
            onPressed: () {
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
          )
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentNavIndex,
        selectedItemColor: const Color(0xFF1D5BB5),
        unselectedItemColor: Colors.grey,
        onTap: (index) {
          if (index == 1) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const TripHistoryScreen()));
          } else if (index == 2) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
          } else {
            setState(() { _currentNavIndex = index; });
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.speed), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Provider.of<TripProvider>(context, listen: false).loadTrips();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Active Trip Banner
              if (tripProvider.isTripActive)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1D5BB5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Text('Hi, ${user?.fullName ?? "Executive"}', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      const Text('Your trip is currently active.', style: TextStyle(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEF4444),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            _showEndShiftModal(context);
                          },
                          icon: const Icon(Icons.stop, color: Colors.white),
                          label: const Text('END TRIP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: Column(
                    children: [
                      Text('Hi, ${user?.fullName ?? "Executive"}', style: const TextStyle(color: Colors.black87, fontSize: 22, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      const Text('You have not started your shift yet.', style: TextStyle(color: Colors.grey, fontSize: 14)),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1D5BB5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () => _showStartShiftModal(context),
                          icon: const Icon(Icons.play_arrow, color: Colors.white),
                          label: const Text('START SHIFT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
                    ],
                  ),
                ),
              
              const SizedBox(height: 16),
              
              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: tripProvider.isTripActive ? () => _showAddExpenseModal(context) : null,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: tripProvider.isTripActive ? Colors.orange.withOpacity(0.12) : Colors.grey.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.receipt_long, color: tripProvider.isTripActive ? Colors.orange : Colors.grey),
                            ),
                            const SizedBox(height: 10),
                            Text('Add Expense', style: TextStyle(fontWeight: FontWeight.bold, color: tripProvider.isTripActive ? Colors.black87 : Colors.grey)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const TripHistoryScreen()));
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: Colors.blue.withOpacity(0.12), shape: BoxShape.circle),
                              child: const Icon(Icons.history, color: Color(0xFF1D5BB5)),
                            ),
                            const SizedBox(height: 10),
                            const Text('Trip History', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Today's Activity (Active Shift Details)
              if (tripProvider.isTripActive) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.directions_run, color: Colors.blue, size: 20),
                              SizedBox(width: 8),
                              Text("Live Shift Activity", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                            child: const Text('TRACKING', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Starting Odometer', style: TextStyle(color: Colors.grey)),
                          Text('${tripProvider.startReading} KM', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const Divider(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Live Distance', style: TextStyle(color: Colors.grey)),
                          Text('${tripProvider.liveDistance.toStringAsFixed(2)} KM', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on, color: Colors.red, size: 16),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              tripProvider.currentAddress,
                              style: const TextStyle(color: Colors.black87, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      if (tripProvider.fuelAmount > 0 || tripProvider.miscAmount > 0 || tripProvider.fuelBillUrl != null || tripProvider.miscBillUrl != null) ...[
                        const Divider(height: 24),
                        const Row(
                          children: [
                            Icon(Icons.receipt_long, color: Colors.green, size: 18),
                            SizedBox(width: 8),
                            Text('Logged Expenses (Saved)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (tripProvider.fuelAmount > 0 || tripProvider.fuelBillUrl != null)
                          Container(
                            padding: const EdgeInsets.all(8),
                            margin: const EdgeInsets.only(bottom: 6),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                if (tripProvider.fuelBillUrl != null && tripProvider.fuelBillUrl!.isNotEmpty)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: PhotoThumbnail(path: tripProvider.fuelBillUrl!, size: 48),
                                  ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Fuel / Petrol Bill', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      Text('₹${tripProvider.fuelAmount.toStringAsFixed(0)}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.check_circle, color: Colors.green, size: 18),
                              ],
                            ),
                          ),
                        if (tripProvider.miscAmount > 0 || tripProvider.miscBillUrl != null)
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                if (tripProvider.miscBillUrl != null && tripProvider.miscBillUrl!.isNotEmpty)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: PhotoThumbnail(path: tripProvider.miscBillUrl!, size: 48),
                                  ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(tripProvider.miscRemarks.isNotEmpty ? tripProvider.miscRemarks : 'Misc Expense', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                                      Text('₹${tripProvider.miscAmount.toStringAsFixed(0)}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.check_circle, color: Colors.green, size: 18),
                              ],
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // RECENT TRIPS & HISTORY SECTION DIRECTLY ON HOME SCREEN
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.history, color: Color(0xFF1D5BB5), size: 20),
                            SizedBox(width: 8),
                            Text('Recent Trips & History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const TripHistoryScreen()));
                          },
                          child: const Text('View All →', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1D5BB5))),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    if (tripProvider.isLoading && tripProvider.trips.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (tripProvider.trips.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(Icons.history_outlined, size: 40, color: Colors.grey),
                              SizedBox(height: 8),
                              Text('No past trips found.', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
                              Text('Start a shift to record your travel & fuel expenses.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: tripProvider.trips.length > 4 ? 4 : tripProvider.trips.length,
                        separatorBuilder: (_, __) => const Divider(height: 18),
                        itemBuilder: (context, index) {
                          final trip = tripProvider.trips[index];
                          final double totalExpense = (trip.fuelBill?.amount ?? 0) + trip.miscAmount;
                          final bool isShiftActive = trip.status.toLowerCase() == 'active';

                          return InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => TripDetailScreen(trip: trip),
                                ),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  if (trip.fuelBill?.imageUrl != null && trip.fuelBill!.imageUrl.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 12),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(6),
                                        child: PhotoThumbnail(path: trip.fuelBill!.imageUrl, size: 48),
                                      ),
                                    )
                                  else if (trip.startOdometerImageUrl.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 12),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(6),
                                        child: PhotoThumbnail(path: trip.startOdometerImageUrl, size: 48),
                                      ),
                                    ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              DateFormat('MMM dd, yyyy').format(trip.date),
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                            ),
                                            StatusBadge(status: trip.status),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          isShiftActive
                                              ? 'Active Shift In Progress'
                                              : 'Distance: ${trip.distanceKm.toStringAsFixed(1)} KM (${trip.startReading.toStringAsFixed(0)} → ${trip.endReading.toStringAsFixed(0)})',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isShiftActive ? Colors.orange.shade800 : Colors.black87,
                                            fontWeight: isShiftActive ? FontWeight.bold : FontWeight.normal,
                                          ),
                                        ),
                                        if (totalExpense > 0)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 2),
                                            child: Text(
                                              'Expense: ₹${totalExpense.toStringAsFixed(0)}',
                                              style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
