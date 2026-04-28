package invigo.invigo.controller;

import invigo.invigo.entity.LoginHistory;
import invigo.invigo.service.LoginHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/logins")
@CrossOrigin(origins = "*")
public class LoginHistoryController {

    @Autowired
    private LoginHistoryService service;

    @GetMapping
    public ResponseEntity<List<LoginHistory>> getLoginHistories() {
        return ResponseEntity.ok(service.getAllHistories());
    }
}
