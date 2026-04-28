package invigo.invigo;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.DiscountSuggestion;
import invigo.invigo.entity.Product;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.DiscountRepository;
import invigo.invigo.service.DiscountService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscountServiceTest {

    @Mock
    private DiscountRepository discountRepository;

    @Mock
    private BatchRepository batchRepository;

    @InjectMocks
    private DiscountService discountService;

    @Test
    void updateDiscount_allowsManagerApprovalForSellableBatch() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Cheese");

        Batch batch = new Batch();
        batch.setId(5L);
        batch.setProduct(product);
        batch.setQuantity(12);
        batch.setExpiryDate(LocalDate.now().plusDays(2));

        DiscountSuggestion suggestion = new DiscountSuggestion();
        suggestion.setId(10L);
        suggestion.setProduct(product);
        suggestion.setBatch(batch);
        suggestion.setSuggestedRate(20.0);
        suggestion.setStatus("PENDING");

        DiscountService.UpdateDiscountRequest request = new DiscountService.UpdateDiscountRequest();
        request.setStatus("ACTIVE");
        request.setFinalRate(25.0);

        when(discountRepository.findAll()).thenReturn(List.of(suggestion));
        when(discountRepository.findById(10L)).thenReturn(Optional.of(suggestion));
        when(discountRepository.save(any(DiscountSuggestion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DiscountSuggestion updated = discountService.updateDiscount(10L, request);

        assertEquals("ACTIVE", updated.getStatus());
        assertEquals(25.0, updated.getFinalRate());
    }
}
