function mapSla(row) {
    if (!row) return null;
    return {
        slaId: row.SLAId,
        name: row.Name,
        applicableEntity: row.ApplicableEntity || 'Case',
        isDefault: Boolean(row.IsDefault),
        status: row.Status || 'Active',
        createdOn: row.CreatedOn,
    };
}

function mapSlaItem(row) {
    if (!row) return null;
    return {
        slaItemId: row.SLAItemId,
        slaId: row.SLAId,
        name: row.Name,
        applicableWhen: row.ApplicableWhen ? JSON.parse(row.ApplicableWhen) : {},
        firstResponseTime: row.FirstResponseTime,
        resolutionTime: row.ResolutionTime,
        sortOrder: row.SortOrder || 0,
        createdOn: row.CreatedOn,
    };
}

function mapEntitlement(row) {
    if (!row) return null;
    return {
        entitlementId: row.EntitlementId,
        accountId: row.AccountId,
        slaId: row.SLAId,
        startDate: row.StartDate,
        endDate: row.EndDate,
        status: row.Status || 'Active',
        createdOn: row.CreatedOn,
    };
}

module.exports = {
    mapSla,
    mapSlaItem,
    mapEntitlement,
};
