enum OrderSideEnum {
    BUY = 0,
    SELL = 1,
}

enum TimeInForceEnum {
    GTC = 0, // Good Till Cancel
    IOC = 1, // Immediate Or Cancel
    FOK = 2, // Fill Or Kill
}

enum TimeFrame {
    DAILY = "daily",
    MINUTE = "minute",
    FIVE_MINUTE = "fiveMinute",
    HOURLY = "hourly",
}

export { OrderSideEnum, TimeInForceEnum, TimeFrame };