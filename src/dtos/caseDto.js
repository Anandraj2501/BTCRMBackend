function toCaseDto(row) {
    if (!row) return null;

    return {
        caseId: row.CaseId,
        title: row.Title,
        description: row.Description || '',
        ticketNumber: row.TicketNumber,
        priority: row.Priority,
        status: row.Status,
        accountId: row.AccountId,
        accountName: row.AccountName || '',
        accountType: row.AccountType || 'Bronze',
        contactId: row.ContactId || null,
        contactName: row.ContactName || '',
        slaId: row.SLAId || null,
        slaName: row.SLAName || '',
        firstResponseDueDate: row.FirstResponseDueDate,
        resolutionDueDate: row.ResolutionDueDate,
        firstResponseActualTime: row.FirstResponseActualTime,
        resolutionActualTime: row.ResolutionActualTime,
        slaStatus: row.SLAStatus || 'InProgress',
        createdOn: row.CreatedOn,
        modifiedOn: row.ModifiedOn,
    };
}

function toPagedCaseDto(result) {
    return {
        items: (result.items || []).map(toCaseDto),
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
    };
}

module.exports = {
    toCaseDto,
    toPagedCaseDto,
};
