// Hierarchical margin report data structure
export const marginReportData = [
  {
    service: 'Finance',
    finalBilling: 4250000,
    executiveCost: 1450000,
    managerCost: 920000,
    gst: 765000,
    totalCost: 3135000,
    margin: 1115000,
    marginPercent: 26.2,
    teamCategories: [
      {
        name: 'In-House Full time employee',
        finalBilling: 2850000,
        executiveCost: 980000,
        managerCost: 620000,
        gst: 513000,
        totalCost: 2113000,
        margin: 737000,
        marginPercent: 25.9,
        employees: [
          { name: 'Abdul Rahman', finalBilling: 380000, executiveCost: 128000, managerCost: 82000, gst: 68400, totalCost: 278400, margin: 101600, marginPercent: 26.7 },
          { name: 'Anil Kapoor', finalBilling: 420000, executiveCost: 142000, managerCost: 89000, gst: 75600, totalCost: 306600, margin: 113400, marginPercent: 27.0 },
          { name: 'Rohan Desai', finalBilling: 360000, executiveCost: 125000, managerCost: 78000, gst: 64800, totalCost: 267800, margin: 92200, marginPercent: 25.6 },
          { name: 'Kavita Nair', finalBilling: 395000, executiveCost: 135000, managerCost: 85000, gst: 71100, totalCost: 291100, margin: 103900, marginPercent: 26.3 },
          { name: 'Vikram Singh', finalBilling: 410000, executiveCost: 138000, managerCost: 87000, gst: 73800, totalCost: 298800, margin: 111200, marginPercent: 27.1 },
          { name: 'Neha Gupta', finalBilling: 350000, executiveCost: 122000, managerCost: 75000, gst: 63000, totalCost: 260000, margin: 90000, marginPercent: 25.7 },
          { name: 'Arjun Reddy', finalBilling: 535000, executiveCost: 190000, managerCost: 124000, gst: 96300, totalCost: 410300, margin: 124700, marginPercent: 23.3 },
        ]
      },
      {
        name: 'Non-Full time employee',
        finalBilling: 980000,
        executiveCost: 345000,
        managerCost: 210000,
        gst: 176400,
        totalCost: 731400,
        margin: 248600,
        marginPercent: 25.4,
        employees: [
          { name: 'Meera Kulkarni', finalBilling: 185000, executiveCost: 68000, managerCost: 42000, gst: 33300, totalCost: 143300, margin: 41700, marginPercent: 22.5 },
          { name: 'Sanjay Malik', finalBilling: 220000, executiveCost: 78000, managerCost: 48000, gst: 39600, totalCost: 165600, margin: 54400, marginPercent: 24.7 },
          { name: 'Ritu Saxena', finalBilling: 195000, executiveCost: 72000, managerCost: 44000, gst: 35100, totalCost: 151100, margin: 43900, marginPercent: 22.5 },
          { name: 'Gaurav Bhatt', finalBilling: 210000, executiveCost: 75000, managerCost: 46000, gst: 37800, totalCost: 158800, margin: 51200, marginPercent: 24.4 },
          { name: 'Swati Jain', finalBilling: 170000, executiveCost: 52000, managerCost: 30000, gst: 30600, totalCost: 112600, margin: 57400, marginPercent: 33.8 },
        ]
      },
      {
        name: 'Outside FTE',
        finalBilling: 420000,
        executiveCost: 125000,
        managerCost: 90000,
        gst: 75600,
        totalCost: 290600,
        margin: 129400,
        marginPercent: 30.8,
        employees: [
          { name: 'Afroz Khan', finalBilling: 140000, executiveCost: 42000, managerCost: 30000, gst: 25200, totalCost: 97200, margin: 42800, marginPercent: 30.6 },
          { name: 'Suman Patel', finalBilling: 150000, executiveCost: 45000, managerCost: 32000, gst: 27000, totalCost: 104000, margin: 46000, marginPercent: 30.7 },
          { name: 'Mansi Shah', finalBilling: 130000, executiveCost: 38000, managerCost: 28000, gst: 23400, totalCost: 89400, margin: 40600, marginPercent: 31.2 },
        ]
      },
    ]
  },
  {
    service: 'Performance Marketing',
    finalBilling: 5680000,
    executiveCost: 2150000,
    managerCost: 1280000,
    gst: 1022400,
    totalCost: 4452400,
    margin: 1227600,
    marginPercent: 21.6,
    teamCategories: [
      {
        name: 'In-House Full time employee',
        finalBilling: 4120000,
        executiveCost: 1580000,
        managerCost: 920000,
        gst: 741600,
        totalCost: 3241600,
        margin: 878400,
        marginPercent: 21.3,
        employees: [
          { name: 'Rakesh Sinha', finalBilling: 485000, executiveCost: 188000, managerCost: 110000, gst: 87300, totalCost: 385300, margin: 99700, marginPercent: 20.6 },
          { name: 'Shweta Malhotra', finalBilling: 520000, executiveCost: 198000, managerCost: 118000, gst: 93600, totalCost: 409600, margin: 110400, marginPercent: 21.2 },
          { name: 'Ishaan Puri', finalBilling: 445000, executiveCost: 172000, managerCost: 98000, gst: 80100, totalCost: 350100, margin: 94900, marginPercent: 21.3 },
          { name: 'Shreya Kapoor', finalBilling: 410000, executiveCost: 158000, managerCost: 92000, gst: 73800, totalCost: 323800, margin: 86200, marginPercent: 21.0 },
          { name: 'Mayank Ahuja', finalBilling: 395000, executiveCost: 155000, managerCost: 88000, gst: 71100, totalCost: 314100, margin: 80900, marginPercent: 20.5 },
          { name: 'Tanvi Deshmukh', finalBilling: 435000, executiveCost: 165000, managerCost: 96000, gst: 78300, totalCost: 339300, margin: 95700, marginPercent: 22.0 },
          { name: 'Aditya Rane', finalBilling: 460000, executiveCost: 178000, managerCost: 102000, gst: 82800, totalCost: 362800, margin: 97200, marginPercent: 21.1 },
          { name: 'Riya Chawla', finalBilling: 425000, executiveCost: 162000, managerCost: 94000, gst: 76500, totalCost: 332500, margin: 92500, marginPercent: 21.8 },
          { name: 'Harsh Mittal', finalBilling: 545000, executiveCost: 204000, managerCost: 122000, gst: 98100, totalCost: 424100, margin: 120900, marginPercent: 22.2 },
        ]
      },
      {
        name: 'Non-Full time employee',
        finalBilling: 1120000,
        executiveCost: 425000,
        managerCost: 260000,
        gst: 201600,
        totalCost: 886600,
        margin: 233400,
        marginPercent: 20.8,
        employees: [
          { name: 'Sara Nayyar', finalBilling: 235000, executiveCost: 92000, managerCost: 56000, gst: 42300, totalCost: 190300, margin: 44700, marginPercent: 19.0 },
          { name: 'Aman Vohra', finalBilling: 210000, executiveCost: 82000, managerCost: 50000, gst: 37800, totalCost: 169800, margin: 40200, marginPercent: 19.1 },
          { name: 'Tara Bajaj', finalBilling: 245000, executiveCost: 95000, managerCost: 58000, gst: 44100, totalCost: 197100, margin: 47900, marginPercent: 19.6 },
          { name: 'Reyansh Datta', finalBilling: 220000, executiveCost: 84000, managerCost: 52000, gst: 39600, totalCost: 175600, margin: 44400, marginPercent: 20.2 },
          { name: 'Kiara Talwar', finalBilling: 210000, executiveCost: 72000, managerCost: 44000, gst: 37800, totalCost: 153800, margin: 56200, marginPercent: 26.8 },
        ]
      },
      {
        name: 'Outside FTE',
        finalBilling: 440000,
        executiveCost: 145000,
        managerCost: 100000,
        gst: 79200,
        totalCost: 324200,
        margin: 115800,
        marginPercent: 26.3,
        employees: [
          { name: 'Tarun Arora', finalBilling: 155000, executiveCost: 52000, managerCost: 35000, gst: 27900, totalCost: 114900, margin: 40100, marginPercent: 25.9 },
          { name: 'Nidhi Choudhary', finalBilling: 165000, executiveCost: 54000, managerCost: 38000, gst: 29700, totalCost: 121700, margin: 43300, marginPercent: 26.2 },
          { name: 'Varun Chopra', finalBilling: 120000, executiveCost: 39000, managerCost: 27000, gst: 21600, totalCost: 87600, margin: 32400, marginPercent: 27.0 },
        ]
      },
    ]
  },

];
