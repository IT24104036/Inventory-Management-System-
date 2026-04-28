package invigo.invigo.controller;

import invigo.invigo.service.DiscountService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertsController {

    private final DiscountService discountService;

    public AlertsController(DiscountService discountService) {
        this.discountService = discountService;
    }

    @GetMapping("/expiry-actions")
    public Map<String, Object> getExpiryActions() {
        return discountService.getExpiryActionFeed();
    }
}
