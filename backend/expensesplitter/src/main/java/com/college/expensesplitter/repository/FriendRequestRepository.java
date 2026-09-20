package com.college.expensesplitter.repository;

import com.college.expensesplitter.model.entity.FriendRequest;
import com.college.expensesplitter.model.entity.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    List<FriendRequest> findByReceiver_IdAndStatusOrderByCreatedAtDesc(Long receiverId, FriendshipStatus status);

    @Query("SELECT fr FROM FriendRequest fr WHERE (fr.sender.id = :u1 AND fr.receiver.id = :u2) OR (fr.sender.id = :u2 AND fr.receiver.id = :u1)")
    Optional<FriendRequest> findBetweenUsers(@Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT fr FROM FriendRequest fr WHERE (fr.sender.id = :userId OR fr.receiver.id = :userId) AND fr.status = com.college.expensesplitter.model.entity.FriendshipStatus.ACCEPTED ORDER BY fr.updatedAt DESC")
    List<FriendRequest> findAcceptedFriendships(@Param("userId") Long userId);

    @Query("SELECT COUNT(fr) FROM FriendRequest fr WHERE (fr.sender.id = :userId OR fr.receiver.id = :userId) AND fr.status = com.college.expensesplitter.model.entity.FriendshipStatus.ACCEPTED")
    long countAcceptedFriendships(@Param("userId") Long userId);

    @Query("SELECT fr FROM FriendRequest fr WHERE fr.sender.id = :userId OR fr.receiver.id = :userId")
    List<FriendRequest> findAllByUser(@Param("userId") Long userId);
}
