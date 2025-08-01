const db = require('../config/db');
const moment = require('moment');

module.exports = {
    getDashboardAnalytics: async (info) => {
        try {
            // Get total cards scanned
            let totalCardsResult = await db.getResults(`
                SELECT COUNT(*) as total_cards 
                FROM cardmaster 
                WHERE isdelete = false
            `);
            
            // Get cards scanned this week
            let weekStartDate = moment().startOf('week').format('YYYY-MM-DD');
            let weekEndDate = moment().endOf('week').format('YYYY-MM-DD');
            
            let weeklyCardsResult = await db.getResults(`
                SELECT COUNT(*) as weekly_cards 
                FROM cardmaster 
                WHERE isdelete = false 
                AND createdat >= $1 
                AND createdat <= $2
            `, [weekStartDate, weekEndDate]);
            
            // Get total users (assuming you have a users table, otherwise adjust)
            let totalUsersResult = await db.getResults(`
                SELECT COUNT(*) as total_users 
                FROM usermaster 
                WHERE isdelete = false
            `);
            
            // Get cards per group data (including cards with no group)
            let cardsPerGroupResult = await db.getResults(`
                SELECT 
                    COALESCE(g.groupname, 'No Group') as title,
                    COUNT(c.cardid) as value
                FROM cardmaster c
                LEFT JOIN groupmaster g ON c.groupid = g.groupid AND g.isdelete = false
                WHERE c.isdelete = false
                GROUP BY g.groupid, g.groupname
                HAVING COUNT(c.cardid) > 0
                ORDER BY value DESC
            `);
            
            // Get cards scanned by tag data (including cards with no tag)
            let cardsScannedResult = await db.getResults(`
                SELECT 
                    COALESCE(t.tagname, 'No Tag') as title,
                    COUNT(c.cardid) as value
                FROM cardmaster c
                LEFT JOIN tagmaster t ON c.tagid = t.tagid AND t.isdelete = false
                WHERE c.isdelete = false
                GROUP BY t.tagid, t.tagname
                HAVING COUNT(c.cardid) > 0
                ORDER BY value DESC
            `);
            
            // Get monthly data for the past 12 months
            let monthlyDataResult = await db.getResults(`
                SELECT 
                    DATE_TRUNC('month', createdat) as month,
                    COUNT(*) as count
                FROM cardmaster 
                WHERE isdelete = false 
                AND createdat >= $1
                GROUP BY DATE_TRUNC('month', createdat)
                ORDER BY month
            `, [moment().subtract(11, 'months').startOf('month').format('YYYY-MM-DD')]);
            
            // Process the data for Flutter format
            const totalCards = parseInt(totalCardsResult[0]?.total_cards || 0);
            const weeklyCards = parseInt(weeklyCardsResult[0]?.weekly_cards || 0);
            const totalUsers = parseInt(totalUsersResult[0]?.total_users || 0);
            
            // Process cards per group data (filter out zero values)
            const cardsPerGroup = cardsPerGroupResult
                .filter(item => parseFloat(item.value) > 0)
                .map((item, index) => ({
                    title: item.title,
                    value: parseFloat(item.value),
                    color: getColorForIndex(index, 'group', item.title),
                    radius: 50
                }));
            
            // Process cards scanned data (filter out zero values)
            const cardsScanned = cardsScannedResult
                .filter(item => parseFloat(item.value) > 0)
                .map((item, index) => ({
                    title: item.title,
                    value: parseFloat(item.value),
                    color: getColorForIndex(index, 'tag', item.title),
                    radius: 50
                }));
            
            // Process monthly data
            const monthlyData = [];
            const last12Months = [];
            
            // Generate last 12 months
            for(let i = 11; i >= 0; i--) {
                last12Months.push(moment().subtract(i, 'months').format('YYYY-MM'));
            }
            
            // Fill monthly data
            last12Months.forEach((month, index) => {
                const monthData = monthlyDataResult.find(item => 
                    moment(item.month).format('YYYY-MM') === month
                );
                monthlyData.push({
                    x: index,
                    y: monthData ? parseFloat(monthData.count) : 0
                });
            });
            
            // Add fallback data if no records found
            const finalCardsPerGroup = cardsPerGroup.length > 0 ? cardsPerGroup : [
                {
                    title: "No Data",
                    value: 1,
                    color: "#9E9E9E",
                    radius: 50
                }
            ];
            
            const finalCardsScanned = cardsScanned.length > 0 ? cardsScanned : [
                {
                    title: "No Data",
                    value: 1,
                    color: "#9E9E9E",
                    radius: 50
                }
            ];
            
            return {
                success: 1,
                data: {
                    totalCards: totalCards,
                    weeklyCards: weeklyCards,
                    totalUsers: totalUsers,
                    cardsPerGroup: finalCardsPerGroup,
                    cardsScanned: finalCardsScanned,
                    monthlyData: monthlyData
                }
            };
            
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    }
};

// Helper function to assign colors based on index and handle special cases
function getColorForIndex(index, type, title) {
    if (type === 'group') {
        // Special color for "No Group"
        if (title === 'No Group') return '#9E9E9E';
        const groupColors = ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#607D8B'];
        return groupColors[index % groupColors.length];
    } else if (type === 'tag') {
        // Special color for "No Tag"
        if (title === 'No Tag') return '#9E9E9E';
        const tagColors = ['#2196F3', '#FF9800', '#4CAF50', '#F44336', '#9C27B0', '#607D8B'];
        return tagColors[index % tagColors.length];
    }
    return '#2196F3'; // Default color
}