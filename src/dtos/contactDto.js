function toContactDto(row) {
    if (!row) return null;

    return {
        contactId: row.contactid,
        firstName: row.firstname,
        lastName: row.lastname,
        fullName: row.fullname,
        email: row.email || '',
        phone: row.phone || '',
        parentAccountId: row.parentaccountid || null,
        accountId: row.parentaccountid || null,
        parentAccountName: row.parentaccountname || '',
        jobTitle: row.jobtitle || '',
        ownerId: row.ownerid,
        status: row.status || 'Active',
        createdOn: row.createdon,
        modifiedOn: row.modifiedon,
    };
}

function toPagedContactDto(result) {
    return {
        items: (result.items || []).map(toContactDto),
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
    };
}

module.exports = {
    toContactDto,
    toPagedContactDto,
};
