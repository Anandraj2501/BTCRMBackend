-- Migration 004: Create Activity Infrastructure
USE MiniCRM;
GO

-- Create Note Entity Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Note')
BEGIN
    CREATE TABLE Note (
        NoteId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        BaseEntityId UNIQUEIDENTIFIER UNIQUE,
        Subject NVARCHAR(200),
        Description NVARCHAR(MAX),
        RegardingId UNIQUEIDENTIFIER,
        RegardingType NVARCHAR(100), -- logical name of target entity
        CreatedOn DATETIME DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER
    );
END

-- Create Task Entity Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Task')
BEGIN
    CREATE TABLE Task (
        TaskId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        BaseEntityId UNIQUEIDENTIFIER UNIQUE,
        Subject NVARCHAR(200),
        Description NVARCHAR(MAX),
        DueDate DATETIME,
        StateCode INT DEFAULT 0, -- 0: Open, 1: Completed, 2: Canceled
        StatusCode INT DEFAULT 1,
        RegardingId UNIQUEIDENTIFIER,
        RegardingType NVARCHAR(100), -- logical name of target entity
        CreatedOn DATETIME DEFAULT GETDATE(),
        OwnerId UNIQUEIDENTIFIER
    );
END
GO
