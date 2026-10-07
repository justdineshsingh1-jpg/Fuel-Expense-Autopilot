import sys
with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\[id]\page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

target = """                {trip.fuel_bill_url && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Fuel Bill</p>
                    <ImageViewer src={trip.fuel_bill_url} alt="Fuel Bill" className="h-32 w-full object-cover rounded-lg border border-gray-200" />
                  </div>
                )}"""

new_target = """                {trip.fuel_bill_url && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Fuel Bill (₹{trip.fuel_amount})</p>
                    <ImageViewer src={trip.fuel_bill_url} alt="Fuel Bill" className="h-32 w-full object-cover rounded-lg border border-gray-200" />
                  </div>
                )}
                {trip.misc_bill_url && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Misc Bill (₹{trip.misc_amount})</p>
                    <ImageViewer src={trip.misc_bill_url} alt="Misc Bill" className="h-32 w-full object-cover rounded-lg border border-gray-200" />
                    <p className="text-xs text-gray-500 mt-1">Remarks: {trip.misc_particulars}</p>
                  </div>
                )}"""

c = c.replace(target, new_target)
with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\[id]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
