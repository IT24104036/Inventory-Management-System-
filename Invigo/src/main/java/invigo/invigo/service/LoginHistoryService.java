package invigo.invigo.service;

import invigo.invigo.entity.LoginHistory;
import invigo.invigo.repository.LoginHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LoginHistoryService {

    @Autowired
    private LoginHistoryRepository repository;

    public void recordLogin(String username, String name, String ipAddress, String deviceBrowser, String status) {
        LoginHistory history = new LoginHistory(username, name, LocalDateTime.now(), ipAddress, deviceBrowser, status);
        repository.save(history);
    }

    public List<LoginHistory> getAllHistories() {
        return repository.findAllByOrderByLoginTimeDesc();
    }
}
