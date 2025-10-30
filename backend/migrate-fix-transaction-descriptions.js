require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function migrateTransactionDescriptions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with transactions
    const users = await User.find({
      'wallet.transactions': { $exists: true, $ne: [] }
    });

    console.log(`\n📊 Found ${users.length} users with transactions`);

    let totalUpdated = 0;
    let totalTransactions = 0;

    for (const user of users) {
      let userUpdated = false;
      
      for (let i = 0; i < user.wallet.transactions.length; i++) {
        const transaction = user.wallet.transactions[i];
        totalTransactions++;

        // Check if description matches CMP pattern or old Vietnamese text
        const isCMPPattern = /^CMP[a-f0-9]{8}$/i.test(transaction.description);
        const isOldVietnamese = /^Nap vi CMP/i.test(transaction.description);
        
        if (transaction.type === 'topup' && (isCMPPattern || isOldVietnamese)) {
          // Save old description to payosDescription if not already set
          if (!transaction.payosDescription && isCMPPattern) {
            user.wallet.transactions[i].payosDescription = transaction.description;
          }
          
          // Update to user-friendly description
          user.wallet.transactions[i].description = 'Wallet Top-up via Bank Transfer';
          userUpdated = true;
          totalUpdated++;
          
          console.log(`   ✓ Updated transaction ${transaction._id}: "${transaction.description}" → "Wallet Top-up via Bank Transfer"`);
        }
      }

      if (userUpdated) {
        await user.save();
        console.log(`✅ Updated user ${user.username || user._id} (${user.wallet.transactions.length} transactions)`);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   Total users processed: ${users.length}`);
    console.log(`   Total transactions checked: ${totalTransactions}`);
    console.log(`   Total transactions updated: ${totalUpdated}`);
    console.log(`\n✅ Migration completed successfully!`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
migrateTransactionDescriptions();
