import re

with open('lib/screens/home_screen.dart', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add CameraUtils import
code = code.replace("import '../utils/permission_utils.dart';", "import '../utils/permission_utils.dart';\nimport '../utils/camera_utils.dart';")

# 2. Add End Shift Modal Function just before Add Expense Modal
end_shift_code = """
  void _showEndShiftModal(BuildContext context) {
    final TextEditingController endOdoController = TextEditingController();
    String? capturedImageUrl;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
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
                  const SizedBox(height: 16),
                  const Text('End Odometer Reading (KM) *', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: endOdoController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'e.g. 45250',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Live Dashboard Photo *', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () async {
                      final url = await CameraUtils.captureAndWatermark(context);
                      if (url != null) {
                        setState(() { capturedImageUrl = url; });
                      }
                    },
                    child: Container(
                      height: 150,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: capturedImageUrl != null 
                        ? Image.network(capturedImageUrl!, fit: BoxFit.cover)
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.camera_alt_outlined, size: 40, color: Colors.grey),
                              SizedBox(height: 8),
                              Text('Tap to open Camera', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
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
                      onPressed: () async {
                        if (endOdoController.text.isEmpty || capturedImageUrl == null) return;
                        Navigator.pop(ctx);
                        await Provider.of<TripProvider>(context, listen: false).endTrip(
                          endOdoController.text,
                          capturedImageUrl!,
                          0.0,
                          0.0,
                          'Ended via app'
                        );
                      },
                      child: const Text('Confirm & End Trip', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          }
        );
      },
    );
  }
"""
code = code.replace("  void _showAddExpenseModal(BuildContext context) {", end_shift_code + "\n  void _showAddExpenseModal(BuildContext context) {")

# 3. Modify onPressed for END TRIP button
code = code.replace("await tripProvider.endTrip(tripProvider.startReading, 'dummy');", "_showEndShiftModal(context);")
code = code.replace("await tripProvider.endTrip(tripProvider.startReading, 'dummy', 0.0, 0.0, 'No remarks');", "_showEndShiftModal(context);")

with open('lib/screens/home_screen.dart', 'w', encoding='utf-8') as f:
    f.write(code)
