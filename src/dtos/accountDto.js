function toAccountDto(row) {
    if (!row) return null;

    return {
        accountId: row.accountid,
        name: row.name,
        accountNumber: row.accountnumber || '',
        accountType: row.accounttype || 'Bronze',
        email: row.email || '',
        phone: row.phone || '',
        addressText: [row.street, row.city, row.state, row.country, row.zip].filter(Boolean).join(', '),
        address: {
            street: row.street || '',
            city: row.city || '',
            state: row.state || '',
            country: row.country || '',
            zip: row.zip || '',
        },
        ownerId: row.ownerid,
        status: row.status || 'Active',
        createdOn: row.createdon,
        modifiedOn: row.modifiedon,
    };
}

function toPagedAccountDto(result) {
    return {
        items: (result.items || []).map(toAccountDto),
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
    };
}

module.exports = {
    toAccountDto,
    toPagedAccountDto,
};
