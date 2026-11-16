import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../widgets/stat_card.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _notificationsEnabled = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TripProvider>(context, listen: false).loadTrips();
    });
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentPassController = TextEditingController();
    final newPassController = TextEditingController();
    final confirmPassController = TextEditingController();
    bool isSubmitting = false;
    bool obscureCurrent = true;
    bool obscureNew = true;
    bool obscureConfirm = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Row(
                children: [
                  Icon(Icons.lock_reset, color: Color(0xFF1D5BB5)),
                  SizedBox(width: 10),
                  Text('Change Password', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Set a new private password for your account.',
                      style: TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: currentPassController,
                      obscureText: obscureCurrent,
                      decoration: InputDecoration(
                        labelText: 'Current Password',
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.lock_outline, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(obscureCurrent ? Icons.visibility_off : Icons.visibility, size: 20),
                          onPressed: () => setDialogState(() => obscureCurrent = !obscureCurrent),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: newPassController,
                      obscureText: obscureNew,
                      decoration: InputDecoration(
                        labelText: 'New Password',
                        hintText: 'Min 6 characters',
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(obscureNew ? Icons.visibility_off : Icons.visibility, size: 20),
                          onPressed: () => setDialogState(() => obscureNew = !obscureNew),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: confirmPassController,
                      obscureText: obscureConfirm,
                      decoration: InputDecoration(
                        labelText: 'Confirm New Password',
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.check_circle_outline, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(obscureConfirm ? Icons.visibility_off : Icons.visibility, size: 20),
                          onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1D5BB5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: isSubmitting ? null : () async {
                    final currentP = currentPassController.text.trim();
                    final newP = newPassController.text.trim();
                    final confirmP = confirmPassController.text.trim();

                    if (currentP.isEmpty || newP.isEmpty || confirmP.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please fill all fields.')),
                      );
                      return;
                    }

                    if (newP.length < 6) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('New password must be at least 6 characters.')),
                      );
                      return;
                    }

                    if (newP != confirmP) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('New password and confirmation do not match!'), backgroundColor: Colors.red),
                      );
                      return;
                    }

                    setDialogState(() => isSubmitting = true);
                    final messenger = ScaffoldMessenger.of(context);
                    final authProv = Provider.of<AuthProvider>(context, listen: false);

                    final errorMsg = await authProv.changePassword(currentP, newP);

                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                    }

                    if (errorMsg == null) {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('Password changed successfully! Use your new password next time you log in.'),
                          backgroundColor: Colors.green,
                          duration: Duration(seconds: 4),
                        ),
                      );
                    } else {
                      messenger.showSnackBar(
                        SnackBar(content: Text(errorMsg), backgroundColor: Colors.red),
                      );
                    }
                  },
                  child: isSubmitting
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Save Password', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _handleLogout(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirm == true && context.mounted) {
      Provider.of<AuthProvider>(context, listen: false).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final tripProvider = Provider.of<TripProvider>(context);

    // Compute dynamic current-month summary for logged-in user
    final now = DateTime.now();
    final currentMonthTrips = tripProvider.trips.where((t) =>
        t.date.year == now.year && t.date.month == now.month).toList();

    final double totalKm = currentMonthTrips.fold(0.0, (sum, t) => sum + t.distanceKm);
    final double totalFuel = currentMonthTrips.fold(0.0, (sum, t) => sum + (t.fuelBill?.amount ?? 0.0));
    final int daysLogged = currentMonthTrips.map((t) => '${t.date.year}-${t.date.month}-${t.date.day}').toSet().length;
    final int pendingFlags = currentMonthTrips.where((t) => t.flags.isNotEmpty || t.status.toLowerCase() == 'flagged').length;

    final String totalKmStr = totalKm == 0
        ? '0'
        : (totalKm % 1 == 0 ? totalKm.toInt().toString() : totalKm.toStringAsFixed(1));
    final String totalFuelStr = '₹${totalFuel.toStringAsFixed(0)}';
    final String daysLoggedStr = '$daysLogged';
    final String pendingFlagsStr = '$pendingFlags';

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
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
              // Employee Details Card
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: Theme.of(context).primaryColor,
                        child: Text(
                          user?.fullName.substring(0, 1).toUpperCase() ?? 'U',
                          style: const TextStyle(fontSize: 24, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.fullName ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            Text('Code: ${user?.employeeCode ?? ''}', style: const TextStyle(color: Colors.grey)),
                            Text(user?.email ?? '', style: const TextStyle(color: Colors.grey)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Theme.of(context).primaryColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text('${user?.department} - ${user?.role}', style: TextStyle(color: Theme.of(context).primaryColor, fontSize: 12)),
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              
              const Text('Monthly Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  StatCard(title: 'Total KM', value: totalKmStr, icon: Icons.directions_car, color: Colors.blue),
                  StatCard(title: 'Total Fuel ₹', value: totalFuelStr, icon: Icons.local_gas_station, color: Colors.green),
                  StatCard(title: 'Days Logged', value: daysLoggedStr, icon: Icons.calendar_today, color: Colors.orange),
                  StatCard(title: 'Pending Flags', value: pendingFlagsStr, icon: Icons.flag, color: Colors.red.shade400),
                ],
              ),
              const SizedBox(height: 24),

            const Text('Account & Security', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFEFF6FF),
                      child: Icon(Icons.lock_reset, color: Color(0xFF1D5BB5)),
                    ),
                    title: const Text('Change Password', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Update your private login password'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _showChangePasswordDialog(context),
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    secondary: const CircleAvatar(
                      backgroundColor: Color(0xFFF1F5F9),
                      child: Icon(Icons.notifications_none, color: Colors.blueGrey),
                    ),
                    title: const Text('Push Notifications', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Trip updates & approvals'),
                    value: _notificationsEnabled,
                    onChanged: (val) => setState(() => _notificationsEnabled = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('Logout', style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () => _handleLogout(context),
              ),
            ),
            const SizedBox(height: 16),
            const Center(
              child: Text('Version 1.0.0+1', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ),
          ],
        ),
      ),
    ),
  );
}
}
