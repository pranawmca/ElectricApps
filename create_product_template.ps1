try {
  $path = "c:\Projects\ElectricApps\public\assets\templates\product_template.xlsx"
  if (Test-Path $path) { 
    try {
        Remove-Item $path -Force 
    } catch {
        Write-Warning "Could not delete existing file."
    }
  }

  $excel = New-Object -ComObject Excel.Application
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Add()
  $sheet = $workbook.Worksheets.Item(1)
  
  # Headers
  # Headers (Assigned Individually to Ensure no column is skipped)
  $sheet.Cells.Item(1, 1) = "Category"
  $sheet.Cells.Item(1, 2) = "Subcategory"
  $sheet.Cells.Item(1, 3) = "ProductName"
  $sheet.Cells.Item(1, 4) = "SKU"
  $sheet.Cells.Item(1, 5) = "Brand"
  $sheet.Cells.Item(1, 6) = "Unit"
  $sheet.Cells.Item(1, 7) = "BasePrice"
  $sheet.Cells.Item(1, 8) = "MRP"
  $sheet.Cells.Item(1, 9) = "Discount"
  $sheet.Cells.Item(1, 10) = "SaleRate"
  $sheet.Cells.Item(1, 11) = "GST%"
  $sheet.Cells.Item(1, 12) = "HSNCode"
  $sheet.Cells.Item(1, 13) = "MinStock"
  $sheet.Cells.Item(1, 14) = "DamagedStock"
  $sheet.Cells.Item(1, 15) = "ProductType"
  $sheet.Cells.Item(1, 16) = "TrackInventory"
  $sheet.Cells.Item(1, 17) = "RequiresExpiry"
  $sheet.Cells.Item(1, 18) = "Active"
  $sheet.Cells.Item(1, 19) = "DefaultWarehouse"
  $sheet.Cells.Item(1, 20) = "DefaultRack"
  $sheet.Cells.Item(1, 21) = "Description"
  
  # Data from Screenshot (10 Records)
  $data = @(
    @("Smart Electrical", "Fans", "Ceiling Fan", "ELEC001", "Havells", "PIECE", 1800, 2500, 10, 2200, 18, "8414", 10, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack A3", "High speed decorative fan"),
    @("Smart Electrical", "Lights", "LED Bulb 9W", "ELEC002", "Philips", "PIECE", 60, 120, 15, 100, 12, "8539", 50, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack R7", "Cool day light LED"),
    @("Smart Electrical", "Switches", "Modular Switch", "ELEC003", "Anchor", "PIECE", 25, 45, 5, 35, 18, "8536", 100, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack A3", "Smooth modular switch"),
    @("Smart Electrical", "Wires", "Copper Wire 2.5mm", "ELEC004", "Polycab", "ROLL", 900, 1300, 10, 1150, 18, "8544", 20, 0, "finished", "TRUE", "FALSE", "TRUE", "Cable & Wire Warehouse", "Rack C2", "FR PVC insulated wire"),
    @("Smart Electrical", "Appliances", "Electric Kettle", "ELEC005", "Prestige", "PIECE", 750, 1200, 12, 1050, 18, "8516", 5, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack R10", "Stainless steel kettle"),
    @("Smart Electrical", "Protection", "MCB Single Pole", "ELEC006", "Schneider", "PIECE", 150, 250, 10, 220, 18, "8536", 15, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack A3", "C-Curve circuit breaker"),
    @("Smart Electrical", "Cables", "Coaxial Cable", "ELEC007", "Finolex", "ROLL", 1100, 1600, 10, 1400, 18, "8544", 10, 0, "finished", "TRUE", "FALSE", "TRUE", "Cable & Wire Warehouse", "Rack C2", "TV signal cable"),
    @("Smart Electrical", "Tools", "Digital Multimeter", "ELEC008", "Mastech", "PIECE", 450, 800, 10, 700, 18, "8030", 5, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack A3", "Auto-ranging multimeter"),
    @("Smart Electrical", "Batteries", "Inverter Battery", "ELEC009", "Luminous", "PIECE", 12000, 16000, 15, 14500, 28, "8507", 3, 0, "finished", "TRUE", "TRUE", "TRUE", "Main Warehouse", "Rack R2", "Tall tubular battery"),
    @("Smart Electrical", "Fittings", "Wall Bracket", "ELEC010", "Murphy", "PIECE", 350, 600, 10, 520, 18, "9405", 20, 0, "finished", "TRUE", "FALSE", "TRUE", "Main Warehouse", "Rack A3", "Adjustable wall fitting")
  )

  for ($i = 0; $i -lt $data.Length; $i++) {
    for ($j = 0; $j -lt $data[$i].Length; $j++) {
      $sheet.Cells.Item($i + 2, $j + 1) = $data[$i][$j]
    }
  }

  # Formatting
  $headerRange = $sheet.Range("A1", "U1")
  $headerRange.Font.Bold = $true
  $sheet.Columns.AutoFit()

  $workbook.SaveAs($path)
  $workbook.Close()
  $excel.Quit()
  
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
  Write-Host "Product Excel template created successfully at $path"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
