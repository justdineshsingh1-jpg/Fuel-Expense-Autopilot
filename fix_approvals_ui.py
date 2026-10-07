import re

with open('web/src/app/(dashboard)/approvals/[id]/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add Miscellaneous amounts
misc_code = """
                </div>

                <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <p className="text-purple-600 text-xl font-bold">
                      <FiTag />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Misc Claimed</p>
                    <p className="font-bold text-gray-900 text-xl">{formatCurrency(trip.misc_amount || 0)}</p>
                  </div>
"""
code = code.replace("                </div>\n              </CardBody>", misc_code + "                </div>\n              </CardBody>")

# Also fix the import for FiTag if missing
if 'FiTag' not in code:
    code = code.replace('FiDollarSign,', 'FiDollarSign, FiTag,')

# Add Receipt Images if they exist
receipt_ui = """
          {/* Images Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <FiImage className="mr-2 text-blue-600" />
                  Odometer Images
                </h2>
              </CardHeader>
              <CardBody className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Start Odometer</p>
                    {trip.start_odometer_image_url ? (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={trip.start_odometer_image_url} alt="Start Odometer" className="w-full h-auto" />
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">End Odometer</p>
                    {trip.end_odometer_image_url ? (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={trip.end_odometer_image_url} alt="End Odometer" className="w-full h-auto" />
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <FiDollarSign className="mr-2 text-green-600" />
                  Expense Bills
                </h2>
              </CardHeader>
              <CardBody className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Fuel Bill</p>
                    {trip.fuel_bill_url ? (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={trip.fuel_bill_url} alt="Fuel Bill" className="w-full h-auto" />
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Misc Bill</p>
                    {trip.misc_bill_url ? (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={trip.misc_bill_url} alt="Misc Bill" className="w-full h-auto" />
                        {trip.misc_particulars && <p className="text-xs mt-2 text-gray-600 p-2">{trip.misc_particulars}</p>}
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center text-gray-400">
                        <span className="text-center">No Image<br/><span className="text-xs">{trip.misc_particulars}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mb-8 overflow-hidden">
"""
code = code.replace('          <Card className="mb-8 overflow-hidden">', receipt_ui)

with open('web/src/app/(dashboard)/approvals/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
