package invigo.invigo.dto;

public class ExpiryRiskRequest {

    // Current model feature set from AIML/outputs/feature_list.json.
    private double days_until_expiry;
    private double initial_quantity;
    private double shelf_life_days;
    private double storage_temp = 4.0;
    private double temp_deviation = 1.4;
    private double spoilage_sensitivity = 0.5;
    private double units_sold;
    private double daily_demand;
    private double sell_through_rate;
    private double remaining_quantity;
    private double stock_pressure_ratio;
    private double velocity_score;
    private double sales_volatility = 0.3;
    private double expiry_pressure_index;
    private double price_margin_ratio = 0.4494;
    private int category_encoded = 5;
    private int region_encoded = 2;
    private int is_weekend;
    private int is_promoted;
    private double handling_score = 7.0;
    private double packaging_score = 7.0;
    private double supplier_score = 9.0;

    // Compatibility fields used by older UI/API calls.
    private double days_to_expiry_at_arrival;
    private double average_daily_sales;
    private String category;
    private int month;
    private double demand_variability = 0.3;

    public double getDays_until_expiry() { return days_until_expiry; }
    public void setDays_until_expiry(double days_until_expiry) { this.days_until_expiry = days_until_expiry; }

    public double getInitial_quantity() { return initial_quantity; }
    public void setInitial_quantity(double initial_quantity) { this.initial_quantity = initial_quantity; }

    public double getShelf_life_days() { return shelf_life_days; }
    public void setShelf_life_days(double shelf_life_days) { this.shelf_life_days = shelf_life_days; }

    public double getStorage_temp() { return storage_temp; }
    public void setStorage_temp(double storage_temp) { this.storage_temp = storage_temp; }

    public double getTemp_deviation() { return temp_deviation; }
    public void setTemp_deviation(double temp_deviation) { this.temp_deviation = temp_deviation; }

    public double getSpoilage_sensitivity() { return spoilage_sensitivity; }
    public void setSpoilage_sensitivity(double spoilage_sensitivity) { this.spoilage_sensitivity = spoilage_sensitivity; }

    public double getUnits_sold() { return units_sold; }
    public void setUnits_sold(double units_sold) { this.units_sold = units_sold; }

    public double getDaily_demand() { return daily_demand; }
    public void setDaily_demand(double daily_demand) { this.daily_demand = daily_demand; }

    public double getSell_through_rate() { return sell_through_rate; }
    public void setSell_through_rate(double sell_through_rate) { this.sell_through_rate = sell_through_rate; }

    public double getRemaining_quantity() { return remaining_quantity; }
    public void setRemaining_quantity(double remaining_quantity) { this.remaining_quantity = remaining_quantity; }

    public double getStock_pressure_ratio() { return stock_pressure_ratio; }
    public void setStock_pressure_ratio(double stock_pressure_ratio) { this.stock_pressure_ratio = stock_pressure_ratio; }

    public double getVelocity_score() { return velocity_score; }
    public void setVelocity_score(double velocity_score) { this.velocity_score = velocity_score; }

    public double getSales_volatility() { return sales_volatility; }
    public void setSales_volatility(double sales_volatility) { this.sales_volatility = sales_volatility; }

    public double getExpiry_pressure_index() { return expiry_pressure_index; }
    public void setExpiry_pressure_index(double expiry_pressure_index) { this.expiry_pressure_index = expiry_pressure_index; }

    public double getPrice_margin_ratio() { return price_margin_ratio; }
    public void setPrice_margin_ratio(double price_margin_ratio) { this.price_margin_ratio = price_margin_ratio; }

    public int getCategory_encoded() { return category_encoded; }
    public void setCategory_encoded(int category_encoded) { this.category_encoded = category_encoded; }

    public int getRegion_encoded() { return region_encoded; }
    public void setRegion_encoded(int region_encoded) { this.region_encoded = region_encoded; }

    public int getIs_weekend() { return is_weekend; }
    public void setIs_weekend(int is_weekend) { this.is_weekend = is_weekend; }

    public int getIs_promoted() { return is_promoted; }
    public void setIs_promoted(int is_promoted) { this.is_promoted = is_promoted; }

    public double getHandling_score() { return handling_score; }
    public void setHandling_score(double handling_score) { this.handling_score = handling_score; }

    public double getPackaging_score() { return packaging_score; }
    public void setPackaging_score(double packaging_score) { this.packaging_score = packaging_score; }

    public double getSupplier_score() { return supplier_score; }
    public void setSupplier_score(double supplier_score) { this.supplier_score = supplier_score; }

    public double getDays_to_expiry_at_arrival() { return days_to_expiry_at_arrival; }
    public void setDays_to_expiry_at_arrival(double days_to_expiry_at_arrival) { this.days_to_expiry_at_arrival = days_to_expiry_at_arrival; }

    public double getAverage_daily_sales() { return average_daily_sales; }
    public void setAverage_daily_sales(double average_daily_sales) { this.average_daily_sales = average_daily_sales; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public double getDemand_variability() { return demand_variability; }
    public void setDemand_variability(double demand_variability) { this.demand_variability = demand_variability; }
}
