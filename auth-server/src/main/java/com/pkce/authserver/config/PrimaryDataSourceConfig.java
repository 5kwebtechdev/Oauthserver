package com.pkce.authserver.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Properties;

/**
 * Makes this server's original single-datasource JPA setup explicit instead of relying on
 * Spring Boot autoconfiguration, which is required once a second DataSource bean
 * (AdminDataSourceConfig, for mindfullAdmin.Admin) exists in the context - Boot's
 * DataSourceAutoConfiguration/JpaBaseConfiguration back off as soon as any DataSource/
 * EntityManagerFactory/TransactionManager bean is defined explicitly, for either one.
 *
 * Behaviour is unchanged from before: same spring.datasource.* properties (mindfullP1),
 * same ddl-auto/dialect/naming-strategy from application.yml, same entity/repository
 * packages that were already being scanned (com.pkce.authserver.entity and
 * com.pkce.authserver.superme.model / .repository).
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.pkce.authserver.repository",
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef = "transactionManager"
)
public class PrimaryDataSourceConfig {

    // Read from the active profile's spring.jpa.hibernate.ddl-auto instead of hardcoding
    // "validate": the test profile sets this to "none" (Flyway + H2 testmigration is the
    // schema source of truth there - see application-test.yml's comment on why), and a
    // literal "validate" here would ignore that override and run real schema validation
    // against H2's MySQL-compatibility type mapping, which fails on false mismatches.
    @Value("${spring.jpa.hibernate.ddl-auto:validate}")
    private String ddlAuto;

    @Primary
    @Bean(name = "dataSourceProperties")
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    /**
     * Built via DataSourceProperties/DataSourceBuilder rather than binding
     * @ConfigurationProperties straight onto HikariDataSource: this project's existing
     * spring.datasource.url key (used verbatim by every deployment env file already in use)
     * only maps onto Hikari's jdbcUrl field through DataSourceProperties.determineUrl() -
     * Hikari itself has no "url" property, only "jdbcUrl", so a direct Hikari binding would
     * silently leave the connection URL null. This is the same mechanism Spring Boot's own
     * autoconfigured dataSource bean used before this class existed - behavior unchanged.
     */
    @Primary
    @Bean(name = "dataSource")
    public DataSource dataSource(@Qualifier("dataSourceProperties") DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
    }

    @Primary
    @Bean(name = "entityManagerFactory")
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            @Qualifier("dataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.pkce.authserver.entity", "com.pkce.authserver.superme.model");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties props = new Properties();
        props.put("hibernate.hbm2ddl.auto", ddlAuto);
        props.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
        props.put("hibernate.physical_naming_strategy",
                "org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl");

        em.setPersistenceUnitName("primary");
        em.setJpaProperties(props);
        return em;
    }

    @Primary
    @Bean(name = "transactionManager")
    public PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") LocalContainerEntityManagerFactoryBean emf) {

        return new JpaTransactionManager(emf.getObject());
    }
}
