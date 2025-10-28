import * as XLSX from 'xlsx';

/**
 * Export dashboard data to Excel file
 * @param {Object} data - Dashboard data object
 * @param {string} filename - Output filename (default: dashboard-report.xlsx)
 */
export const exportDashboardToExcel = (data, filename = 'dashboard-report.xlsx') => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Overview Statistics
    const overviewData = [
      ['Dashboard Overview Report'],
      ['Generated on:', new Date().toLocaleString()],
      [],
      ['Metric', 'Value', 'Growth (%)'],
      ['Total Revenue', `$${data.totalRevenue?.toLocaleString() || 0}`, data.revenueChange || 0],
      ['Total Bookings', data.totalBookings || 0, data.bookingsChange || 0],
      ['Total Users', data.totalUsers || 0, data.usersChange || 0],
      ['Total Tours', data.totalTours || 0, data.toursChange || 0],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    
    // Set column widths
    overviewSheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Sheet 2: Revenue by Month
    if (data.revenueByMonth && data.revenueByMonth.length > 0) {
      const revenueData = [
        ['Revenue by Month'],
        [],
        ['Month', 'Revenue', 'Bookings']
      ];
      
      data.revenueByMonth.forEach(item => {
        revenueData.push([
          item.month || item.name,
          item.revenue || 0,
          item.bookings || 0
        ]);
      });
      
      const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
      revenueSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue by Month');
    }

    // Sheet 3: All Tours (Full List)
    if (data.topTours && data.topTours.length > 0) {
      const toursData = [
        [`All Tours Performance Report (${data.topTours.length} tours)`],
        ['Generated on:', new Date().toLocaleString()],
        [],
        ['#', 'Tour Name', 'Country', 'City', 'Price', 'Total Bookings', 'Total Revenue']
      ];
      
      // Export ALL tours, not just top 5
      data.topTours.forEach((tour, index) => {
        toursData.push([
          index + 1,
          tour.name || 'Unknown',
          tour.country || 'N/A',
          tour.city || 'N/A',
          `$${(tour.price || 0).toLocaleString()}`,
          tour.bookings || tour.totalBookings || 0,
          `$${(tour.revenue || tour.totalRevenue || 0).toLocaleString()}`
        ]);
      });
      
      const toursSheet = XLSX.utils.aoa_to_sheet(toursData);
      toursSheet['!cols'] = [
        { wch: 5 },
        { wch: 35 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, toursSheet, 'All Tours');
    }

    // Sheet 4: All Bookings (Full List)
    if (data.recentBookings && data.recentBookings.length > 0) {
      const bookingsData = [
        [`All Bookings Report (${data.recentBookings.length} bookings)`],
        ['Generated on:', new Date().toLocaleString()],
        [],
        ['#', 'Customer Name', 'Email', 'Phone', 'Tour Name', 'Tour Date', 'Guests', 'Amount', 'Payment Status', 'Booking Status', 'Booking Date']
      ];
      
      // Export ALL bookings
      data.recentBookings.forEach((booking, index) => {
        const tourDate = booking.tourDate ? new Date(booking.tourDate).toLocaleDateString() : 'N/A';
        const bookingDate = booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 'N/A';
        
        bookingsData.push([
          index + 1,
          booking.customerName || 'Unknown',
          booking.email || 'N/A',
          booking.phone || 'N/A',
          booking.tourName || 'Unknown',
          tourDate,
          booking.numberOfGuests || 0,
          `$${(booking.totalPrice || 0).toLocaleString()}`,
          booking.paymentStatus || 'pending',
          booking.bookingStatus || 'pending',
          bookingDate
        ]);
      });
      
      const bookingsSheet = XLSX.utils.aoa_to_sheet(bookingsData);
      bookingsSheet['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 25 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'All Bookings');
    }

    // Write the file
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

/**
 * Export specific bookings list to Excel
 * @param {Array} bookings - Array of booking objects
 * @param {string} filename - Output filename
 */
export const exportBookingsToExcel = (bookings, filename = 'bookings-report.xlsx') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    const bookingsData = [
      ['Bookings Report'],
      ['Generated on:', new Date().toLocaleString()],
      [],
      ['Customer Name', 'Tour Name', 'Amount', 'Payment Status', 'Booking Status', 'Date']
    ];
    
    bookings.forEach(booking => {
      bookingsData.push([
        booking.customerName || 'Unknown',
        booking.tourName || 'Unknown',
        `$${(booking.totalPrice || 0).toLocaleString()}`,
        booking.paymentStatus || '',
        booking.bookingStatus || '',
        booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : ''
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(bookingsData);
    sheet['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, sheet, 'Bookings');
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting bookings:', error);
    return false;
  }
};

/**
 * Export tours list to Excel
 * @param {Array} tours - Array of tour objects
 * @param {string} filename - Output filename
 */
export const exportToursToExcel = (tours, filename = 'tours-report.xlsx') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    const toursData = [
      ['Tours Report'],
      ['Generated on:', new Date().toLocaleString()],
      [],
      ['Tour Name', 'Bookings', 'Revenue', 'Rating', 'Duration', 'Type']
    ];
    
    tours.forEach(tour => {
      toursData.push([
        tour.name || 'Unknown',
        tour.bookings || 0,
        `$${(tour.revenue || 0).toLocaleString()}`,
        tour.rating || 0,
        tour.duration || '',
        tour.type || ''
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(toursData);
    sheet['!cols'] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, sheet, 'Tours');
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting tours:', error);
    return false;
  }
};
